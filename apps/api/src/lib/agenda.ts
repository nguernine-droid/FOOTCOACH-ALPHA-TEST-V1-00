import { alias } from "drizzle-orm/pg-core";
import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import type { AgendaItemDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { matches, teamEvents, tournamentRegistrations, tournaments, teams } from "../db/schema.js";

const DAY_MS = 24 * 3600 * 1000;

/** Arithmétique de dates naïves (YYYY-MM-DD), stable quelle que soit la TZ */
export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T12:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / DAY_MS);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dates d'occurrence d'un événement dans [from, to] */
function occurrencesOf(event: typeof teamEvents.$inferSelect, from: string, to: string): string[] {
  if (event.recurrence === "none") {
    return event.date >= from && event.date <= to ? [event.date] : [];
  }
  const last = event.recurrenceUntil && event.recurrenceUntil < to ? event.recurrenceUntil : to;
  const dates: string[] = [];
  for (let d = event.date; d <= last; d = addDays(d, 7)) {
    if (d >= from) dates.push(d);
  }
  return dates;
}

const homeTeam = alias(teams, "home_team");
const awayTeam = alias(teams, "away_team");

/**
 * Agenda fusionné d'une équipe sur [from, to] : événements (occurrences
 * générées), matchs et tournois projetés en items homogènes. Partagé entre la
 * route GET /events (équipe active du coach) et le flux ICS d'abonnement
 * (toutes les équipes du coach) — même contenu, deux modes d'accès.
 */
export async function collectAgendaItems(teamId: string, from: string, to: string): Promise<AgendaItemDto[]> {
  // 1. Événements de l'équipe (les récurrents démarrés avant `to` sont candidats)
  const events = await db
    .select()
    .from(teamEvents)
    .where(and(eq(teamEvents.teamId, teamId), lte(teamEvents.date, to)));

  // 2. Matchs de l'équipe dans la fenêtre, projetés en items "match".
  // Un match dont un coach s'est désisté n'occupe plus la date : il sort de l'agenda.
  const matchRows = await db
    .select({ match: matches, home: homeTeam, away: awayTeam })
    .from(matches)
    .innerJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(
      and(
        or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)),
        gte(matches.date, from),
        lte(matches.date, to),
        ne(matches.status, "cancelled"),
      ),
    );

  // 3. Tournois qui occupent l'équipe : ceux qu'elle organise et ceux où elle
  // est inscrite. Une inscription retirée libère la date, comme un match
  // annulé — c'est la ligne qui reste, pas l'occupation.
  const registered = await db
    .select({ id: tournamentRegistrations.tournamentId })
    .from(tournamentRegistrations)
    .where(
      and(eq(tournamentRegistrations.teamId, teamId), eq(tournamentRegistrations.status, "registered")),
    );
  const registeredIds = registered.map((r) => r.id);
  const mine = registeredIds.length
    ? or(eq(tournaments.teamId, teamId), inArray(tournaments.id, registeredIds))
    : eq(tournaments.teamId, teamId);
  // Un tournoi occupe [date, end_date] : il entre dans la fenêtre dès qu'il
  // la chevauche, même commencé avant `from`.
  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(
      and(
        mine,
        ne(tournaments.status, "cancelled"),
        lte(tournaments.date, to),
        sql`coalesce(${tournaments.endDate}, ${tournaments.date}) >= ${from}`,
      ),
    );

  const items: AgendaItemDto[] = [];

  for (const { match, home, away } of matchRows) {
    const opponent = match.homeTeamId === teamId ? away : home;
    items.push({
      id: `match-${match.id}`,
      kind: "match",
      matchId: match.id,
      eventId: null,
      tournamentId: null,
      occurrenceDate: match.date,
      type: "match",
      title: `Match vs ${opponent.name}`,
      startTime: match.time.slice(0, 5),
      endTime: null,
      location: match.location,
      description: null,
      recurrence: "none",
      recurrenceUntil: null,
      matchStatus: match.status,
    });
  }

  // Un tournoi de deux jours occupe deux journées d'agenda, numérotées : deux
  // lignes du même nom, sans rien pour les distinguer, se liraient comme un
  // doublon. Un tournoi n'a pas d'heure réelle (seulement journée/nocturne) :
  // l'heure affichée n'est qu'un repère de tri, le détail du programme se lit
  // sur sa fiche, à un tap d'ici.
  const SESSION_START_TIME: Record<string, string> = { day: "09:00", night: "20:00" };
  for (const tournament of tournamentRows) {
    const lastDay = tournament.endDate ?? tournament.date;
    const days = Math.max(1, daysBetween(tournament.date, lastDay) + 1);
    const organiser = tournament.teamId === teamId;
    for (let day = 0; day < days; day++) {
      const date = addDays(tournament.date, day);
      if (date < from || date > to) continue;
      items.push({
        id: `tournament-${tournament.id}@${date}`,
        kind: "tournament",
        matchId: null,
        eventId: null,
        tournamentId: tournament.id,
        occurrenceDate: date,
        type: "tournoi",
        title: days > 1 ? `${tournament.name} — jour ${day + 1}/${days}` : tournament.name,
        startTime: SESSION_START_TIME[tournament.session] ?? "09:00",
        endTime: null,
        location: `${tournament.stadium}, ${tournament.city}`,
        description: organiser ? "Vous organisez ce tournoi." : "Votre équipe y est inscrite.",
        recurrence: "none",
        recurrenceUntil: null,
        matchStatus: null,
      });
    }
  }

  for (const event of events) {
    for (const date of occurrencesOf(event, from, to)) {
      items.push({
        id: `${event.id}@${date}`,
        kind: "event",
        matchId: null,
        eventId: event.id,
        tournamentId: null,
        occurrenceDate: date,
        type: event.type,
        title: event.title,
        startTime: event.startTime.slice(0, 5),
        endTime: event.endTime?.slice(0, 5) ?? null,
        location: event.location,
        description: event.description,
        recurrence: event.recurrence,
        recurrenceUntil: event.recurrenceUntil,
        matchStatus: null,
      });
    }
  }

  return items.sort((a, b) =>
    `${a.occurrenceDate}T${a.startTime}`.localeCompare(`${b.occurrenceDate}T${b.startTime}`),
  );
}
