import type { FastifyInstance } from "fastify";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import {
  createEventSchema,
  setEventAttendanceSchema,
  type AgendaItemDto,
  type EventAttendanceDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { attendances, eventAttendances, matches, teamEvents, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

const DAY_MS = 24 * 3600 * 1000;
// Verrou identique aux matchs : réponses figées 24h avant le début
const LOCK_MS = 24 * 3600 * 1000;
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

function isStarted(date: string, time: string): boolean {
  return new Date(`${date}T${time}`).getTime() - Date.now() <= 0;
}

function isWithinLockWindow(date: string, time: string): boolean {
  return new Date(`${date}T${time}`).getTime() - Date.now() < LOCK_MS;
}

/**
 * Une réponse déjà donnée est figée à moins de 24h du début ; une première
 * réponse reste possible jusqu'au début (événement créé tardivement).
 */
function isLockedFor(date: string, time: string, hasAnswer: boolean): boolean {
  return isStarted(date, time) || (hasAnswer && isWithinLockWindow(date, time));
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

/** true si `date` est une occurrence valide de l'événement */
function isValidOccurrence(event: typeof teamEvents.$inferSelect, date: string): boolean {
  if (event.recurrence === "none") return date === event.date;
  const gap = daysBetween(event.date, date);
  if (gap < 0 || gap % 7 !== 0) return false;
  return !event.recurrenceUntil || date <= event.recurrenceUntil;
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
  app.get("/events", { preHandler: requireRole("coach", "player", "parent") }, async (request): Promise<AgendaItemDto[]> => {
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

    // 2. Matchs de l'équipe dans la fenêtre, projetés en items "match"
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
        ),
      );

    // Compteurs de présence filtrés sur MON équipe (confidentialité inter-équipes)
    const teamMembers = await db.select().from(users).where(eq(users.teamId, teamId));
    const memberIds = new Set(teamMembers.map((u) => u.id));

    const matchIds = matchRows.map((r) => r.match.id);
    const matchAttendances = matchIds.length
      ? await db.select().from(attendances).where(inArray(attendances.matchId, matchIds))
      : [];

    const eventIds = events.map((e) => e.id);
    const eventResponses = eventIds.length
      ? await db.select().from(eventAttendances).where(inArray(eventAttendances.eventId, eventIds))
      : [];

    const items: AgendaItemDto[] = [];

    for (const { match, home, away } of matchRows) {
      const list = matchAttendances.filter((a) => a.matchId === match.id && memberIds.has(a.userId));
      const mine = list.find((a) => a.userId === request.user.id);
      const opponent = match.homeTeamId === teamId ? away : home;
      items.push({
        id: `match-${match.id}`,
        kind: "match",
        matchId: match.id,
        eventId: null,
        occurrenceDate: match.date,
        type: "match",
        title: `Match vs ${opponent.name}`,
        startTime: match.time.slice(0, 5),
        endTime: null,
        location: match.location,
        description: null,
        recurrence: "none",
        recurrenceUntil: null,
        presentCount: list.filter((a) => a.status === "present").length,
        absentCount: list.filter((a) => a.status === "absent").length,
        myStatus: mine?.status ?? null,
        matchStatus: match.status,
        locked: match.status !== "scheduled" || isLockedFor(match.date, match.time, mine != null),
      });
    }

    for (const event of events) {
      for (const date of occurrencesOf(event, from, to)) {
        const list = eventResponses.filter(
          (r) => r.eventId === event.id && r.occurrenceDate === date && memberIds.has(r.userId),
        );
        const mine = list.find((r) => r.userId === request.user.id);
        items.push({
          id: `${event.id}@${date}`,
          kind: "event",
          matchId: null,
          eventId: event.id,
          occurrenceDate: date,
          type: event.type,
          title: event.title,
          startTime: event.startTime.slice(0, 5),
          endTime: event.endTime?.slice(0, 5) ?? null,
          location: event.location,
          description: event.description,
          recurrence: event.recurrence,
          recurrenceUntil: event.recurrenceUntil,
          presentCount: list.filter((r) => r.status === "present").length,
          absentCount: list.filter((r) => r.status === "absent").length,
          myStatus: mine?.status ?? null,
          matchStatus: null,
          locked: isLockedFor(date, event.startTime, mine != null),
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
    const { id } = request.params as { id: string };
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
    const { id } = request.params as { id: string };
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne vous appartient pas");
    await db.delete(teamEvents).where(eq(teamEvents.id, id));
    return { ok: true };
  });

  // Réponse Présent/Absent d'un joueur à UNE occurrence
  app.put("/events/:id/attendance", { preHandler: requireRole("player") }, async (request) => {
    const { id } = request.params as { id: string };
    const input = setEventAttendanceSchema.parse(request.body);
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne concerne pas votre équipe");
    if (!isValidOccurrence(event, input.date)) throw new HttpError(400, "Cette date ne correspond à aucune occurrence");
    if (isStarted(input.date, event.startTime)) {
      throw new HttpError(400, "L'événement a déjà commencé : les réponses sont closes");
    }
    const [existing] = await db
      .select()
      .from(eventAttendances)
      .where(
        and(
          eq(eventAttendances.eventId, id),
          eq(eventAttendances.occurrenceDate, input.date),
          eq(eventAttendances.userId, request.user.id),
        ),
      );
    if (existing && isWithinLockWindow(input.date, event.startTime)) {
      throw new HttpError(400, "À moins de 24h du début, votre réponse ne peut plus être modifiée");
    }
    await db
      .insert(eventAttendances)
      .values({ eventId: id, occurrenceDate: input.date, userId: request.user.id, status: input.status, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [eventAttendances.eventId, eventAttendances.occurrenceDate, eventAttendances.userId],
        set: { status: input.status, updatedAt: new Date() },
      });
    return { ok: true };
  });

  // Le coach fixe manuellement la réponse d'un joueur pour une occurrence
  // (missclick, désistement obligatoire…) — sans verrou temporel.
  app.put("/events/:id/attendances/:userId", { preHandler: requireRole("coach") }, async (request) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const input = setEventAttendanceSchema.parse(request.body);
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne vous appartient pas");
    if (!isValidOccurrence(event, input.date)) throw new HttpError(400, "Cette date ne correspond à aucune occurrence");
    const [player] = await db.select().from(users).where(eq(users.id, userId));
    if (!player || player.teamId !== event.teamId || player.role !== "player") {
      throw new HttpError(404, "Joueur introuvable dans votre équipe");
    }
    await db
      .insert(eventAttendances)
      .values({ eventId: id, occurrenceDate: input.date, userId, status: input.status, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [eventAttendances.eventId, eventAttendances.occurrenceDate, eventAttendances.userId],
        set: { status: input.status, updatedAt: new Date() },
      });
    return { ok: true };
  });

  // Vue coach : réponses des joueurs de l'équipe pour une occurrence
  app.get("/events/:id/attendances", { preHandler: requireRole("coach") }, async (request): Promise<EventAttendanceDto[]> => {
    const { id } = request.params as { id: string };
    const { date } = request.query as { date?: string };
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne vous appartient pas");
    const occurrenceDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : event.date;
    if (!isValidOccurrence(event, occurrenceDate)) throw new HttpError(400, "Cette date ne correspond à aucune occurrence");
    const rows = await db
      .select({ user: users, response: eventAttendances })
      .from(users)
      .leftJoin(
        eventAttendances,
        and(
          eq(eventAttendances.userId, users.id),
          eq(eventAttendances.eventId, id),
          eq(eventAttendances.occurrenceDate, occurrenceDate),
        ),
      )
      .where(and(eq(users.teamId, event.teamId), eq(users.role, "player")));
    return rows
      .map(({ user, response }) => ({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        jerseyNumber: user.jerseyNumber,
        status: response?.status ?? null,
      }))
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  });
}
