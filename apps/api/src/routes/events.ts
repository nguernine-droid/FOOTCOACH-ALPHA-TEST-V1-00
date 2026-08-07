import type { FastifyInstance } from "fastify";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { createEventSchema, idParamSchema, type AgendaItemDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { matches, teamEvents, teams, tournamentRegistrations, tournaments } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

const DAY_MS = 24 * 3600 * 1000;
// Fenêtre maximale demandable (borne la génération d'occurrences)
const MAX_WINDOW_DAYS = 185;

/** Arithmétique de dates naïves (YYYY-MM-DD), stable quelle que soit la TZ */
function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T12:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / DAY_MS);
}

function todayStr(): string {
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

async function getEventOr404(id: string) {
  const [event] = await db.select().from(teamEvents).where(eq(teamEvents.id, id));
  if (!event) throw new HttpError(404, "Événement introuvable");
  return event;
}

const homeTeam = alias(teams, "home_team");
const awayTeam = alias(teams, "away_team");

export function eventRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Agenda fusionné de l'équipe : événements (occurrences générées) + matchs projetés
  app.get("/events", { preHandler: requireRole("coach") }, async (request): Promise<AgendaItemDto[]> => {
    const teamId = request.user.teamId;
    if (!teamId) throw new HttpError(400, "Aucune équipe associée");
    const query = request.query as { from?: string; to?: string };
    const from = query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : addDays(todayStr(), -7);
    const to = query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : addDays(todayStr(), 60);
    if (from > to || daysBetween(from, to) > MAX_WINDOW_DAYS) {
      throw new HttpError(400, "Fenêtre de dates invalide");
    }

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
    // doublon. L'heure est celle du tournoi — la seule connue, celle du coup
    // d'envoi ; le détail du programme se lit sur sa fiche, à un tap d'ici.
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
          startTime: tournament.time.slice(0, 5),
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
  });

  app.post("/events", { preHandler: requireRole("coach") }, async (request, reply) => {
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const input = createEventSchema.parse(request.body);
    const [created] = await db
      .insert(teamEvents)
      .values({
        teamId: request.user.teamId,
        type: input.type,
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        description: input.description ?? null,
        recurrence: input.recurrence,
        recurrenceUntil: input.recurrence === "weekly" ? (input.recurrenceUntil ?? null) : null,
        createdBy: request.user.id,
      })
      .returning();
    reply.code(201);
    return { id: created.id };
  });

  app.put("/events/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne vous appartient pas");
    const input = createEventSchema.parse(request.body);
    await db
      .update(teamEvents)
      .set({
        type: input.type,
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        description: input.description ?? null,
        recurrence: input.recurrence,
        recurrenceUntil: input.recurrence === "weekly" ? (input.recurrenceUntil ?? null) : null,
      })
      .where(eq(teamEvents.id, id));
    return { ok: true };
  });

  app.delete("/events/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne vous appartient pas");
    await db.delete(teamEvents).where(eq(teamEvents.id, id));
    return { ok: true };
  });

}
