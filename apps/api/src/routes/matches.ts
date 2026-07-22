import type { FastifyInstance } from "fastify";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import {
  createMatchEventSchema,
  setAttendanceSchema,
  updateEditAuthorizationSchema,
  updateScoreSchema,
  type AttendanceDto,
  type MatchDetailDto,
  type MatchDto,
  type MatchEventDto,
  type TeamPresenceDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { attendances, carpoolBookings, matchEvents, matches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

const homeTeam = alias(teams, "home_team");
const awayTeam = alias(teams, "away_team");

type MatchRow = {
  match: typeof matches.$inferSelect;
  home: typeof teams.$inferSelect;
  away: typeof teams.$inferSelect;
};

function baseSelect() {
  return db
    .select({ match: matches, home: homeTeam, away: awayTeam })
    .from(matches)
    .innerJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id));
}

async function attachCounts(rows: MatchRow[], userId: string, viewerTeamId: string | null): Promise<MatchDto[]> {
  if (rows.length === 0) return [];
  const matchIds = rows.map((r) => r.match.id);
  const allAttendances = await db.select().from(attendances).where(inArray(attendances.matchId, matchIds));
  const activeBookings = await db
    .select()
    .from(carpoolBookings)
    .where(and(inArray(carpoolBookings.matchId, matchIds), ne(carpoolBookings.status, "declined")));

  // Confidentialité : les compteurs de présence ne portent que sur l'équipe du demandeur
  // (le coach adverse ne doit pas savoir qui vient). Supporter sans équipe : vue globale.
  const attendeeIds = [...new Set(allAttendances.map((a) => a.userId))];
  const attendeeUsers = attendeeIds.length ? await db.select().from(users).where(inArray(users.id, attendeeIds)) : [];
  const teamOf = new Map(attendeeUsers.map((u) => [u.id, u.teamId]));

  return rows.map(({ match, home, away }) => {
    const list = allAttendances.filter(
      (a) => a.matchId === match.id && (!viewerTeamId || teamOf.get(a.userId) === viewerTeamId),
    );
    const mine = list.find((a) => a.userId === userId);
    const booked = activeBookings.filter(
      (b) => b.matchId === match.id && (!viewerTeamId || teamOf.get(b.driverId) === viewerTeamId),
    ).length;
    return {
      id: match.id,
      homeTeam: { id: home.id, name: home.name, city: home.city },
      awayTeam: { id: away.id, name: away.name, city: away.city },
      date: match.date,
      time: match.time.slice(0, 5),
      location: match.location,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      mySide: viewerTeamId === match.homeTeamId ? "home" : viewerTeamId === match.awayTeamId ? "away" : null,
      awayCoachCanEdit: match.awayCoachCanEdit,
      presentCount: list.filter((a) => a.status === "present").length,
      absentCount: list.filter((a) => a.status === "absent").length,
      // Places de covoiturage encore disponibles (offertes moins réservées)
      transportSeats: Math.max(0, list.reduce((sum, a) => sum + (a.canTransport ? a.transportSeats : 0), 0) - booked),
      myAttendance: mine
        ? {
            status: mine.status,
            canTransport: mine.canTransport,
            transportSeats: mine.transportSeats,
            departureTime: mine.departureTime?.slice(0, 5) ?? null,
            departureArea: mine.departureArea,
          }
        : null,
    };
  });
}

async function getMatchOr404(id: string) {
  const [row] = await baseSelect().where(eq(matches.id, id));
  if (!row) throw new HttpError(404, "Match introuvable");
  return row;
}

function assertCoachOfMatch(match: typeof matches.$inferSelect, teamId: string | null) {
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    throw new HttpError(403, "Vous n'êtes pas le coach d'une des équipes de ce match");
  }
}

// Score et temps forts : réservés au coach émetteur de l'annonce (équipe domicile),
// sauf s'il a explicitement autorisé le coach adverse.
function assertCanEditMatch(match: typeof matches.$inferSelect, teamId: string | null) {
  if (teamId === match.homeTeamId) return;
  if (teamId === match.awayTeamId && match.awayCoachCanEdit) return;
  if (teamId === match.awayTeamId) {
    throw new HttpError(403, "Seul le coach organisateur peut modifier ce match (il peut vous y autoriser)");
  }
  throw new HttpError(403, "Vous n'êtes pas le coach d'une des équipes de ce match");
}

function assertMemberOfMatch(match: typeof matches.$inferSelect, teamId: string | null) {
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    throw new HttpError(403, "Vous n'appartenez pas à une des équipes de ce match");
  }
}

// Verrou fixe : les réponses de présence sont figées 24h avant le coup d'envoi
const ATTENDANCE_LOCK_MS = 24 * 3600 * 1000;

function assertAttendanceOpen(match: typeof matches.$inferSelect) {
  if (new Date(`${match.date}T${match.time}`).getTime() - Date.now() < ATTENDANCE_LOCK_MS) {
    throw new HttpError(400, "Les réponses sont verrouillées 24h avant le coup d'envoi");
  }
}

export function matchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Tous rôles. Coach/player/parent : matchs de leur équipe. Supporter : son équipe, ou tout si non rattaché.
  app.get("/matches", async (request): Promise<MatchDto[]> => {
    const { teamId, role } = request.user;
    const query = baseSelect().orderBy(desc(matches.date), desc(matches.time));
    const rows =
      role === "supporter" && !teamId
        ? await query
        : await baseSelect()
            .where(or(eq(matches.homeTeamId, teamId ?? ""), eq(matches.awayTeamId, teamId ?? "")))
            .orderBy(desc(matches.date), desc(matches.time));
    return attachCounts(rows, request.user.id, request.user.teamId);
  });

  // Endpoint de polling : score + temps forts + compteurs
  app.get("/matches/:id", async (request): Promise<MatchDetailDto> => {
    const { id } = request.params as { id: string };
    const row = await getMatchOr404(id);
    const [dto] = await attachCounts([row], request.user.id, request.user.teamId);
    const events = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, id))
      .orderBy(asc(matchEvents.minute), asc(matchEvents.createdAt));
    const eventDtos: MatchEventDto[] = events.map((e) => ({
      id: e.id,
      minute: e.minute,
      type: e.type,
      side: e.side,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    }));
    return { ...dto, events: eventDtos };
  });

  app.patch("/matches/:id/score", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = request.params as { id: string };
    const input = updateScoreSchema.parse(request.body);
    const row = await getMatchOr404(id);
    assertCanEditMatch(row.match, request.user.teamId);
    await db
      .update(matches)
      .set({
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        ...(input.status ? { status: input.status } : {}),
      })
      .where(eq(matches.id, id));
    return { ok: true };
  });

  app.post("/matches/:id/events", { preHandler: requireRole("coach") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createMatchEventSchema.parse(request.body);
    const row = await getMatchOr404(id);
    assertCanEditMatch(row.match, request.user.teamId);
    const [created] = await db
      .insert(matchEvents)
      .values({ matchId: id, createdBy: request.user.id, ...input })
      .returning();
    reply.code(201);
    return { id: created.id };
  });

  app.delete("/matches/:id/events/:eventId", { preHandler: requireRole("coach") }, async (request) => {
    const { id, eventId } = request.params as { id: string; eventId: string };
    const row = await getMatchOr404(id);
    assertCanEditMatch(row.match, request.user.teamId);
    await db.delete(matchEvents).where(and(eq(matchEvents.id, eventId), eq(matchEvents.matchId, id)));
    return { ok: true };
  });

  // Autoriser (ou retirer) l'édition du score/temps forts au coach adverse —
  // réservé au coach émetteur de l'annonce (équipe domicile).
  app.patch("/matches/:id/edit-authorization", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = request.params as { id: string };
    const input = updateEditAuthorizationSchema.parse(request.body);
    const row = await getMatchOr404(id);
    if (request.user.teamId !== row.match.homeTeamId) {
      throw new HttpError(403, "Seul le coach organisateur peut gérer cette autorisation");
    }
    await db.update(matches).set({ awayCoachCanEdit: input.awayCoachCanEdit }).where(eq(matches.id, id));
    return { ok: true };
  });

  // Présences des joueurs de MON équipe, visibles par tout membre de l'équipe
  // (joueur/parent/coach). Ne liste que les joueurs — jamais l'équipe adverse.
  app.get("/matches/:id/presence", async (request): Promise<TeamPresenceDto[]> => {
    if (!["coach", "player", "parent"].includes(request.user.role)) {
      throw new HttpError(403, "Réservé aux membres de l'équipe");
    }
    const { id } = request.params as { id: string };
    const row = await getMatchOr404(id);
    assertMemberOfMatch(row.match, request.user.teamId);
    const rows = await db
      .select({ user: users, attendance: attendances })
      .from(users)
      .leftJoin(attendances, and(eq(attendances.userId, users.id), eq(attendances.matchId, id)))
      .where(and(eq(users.teamId, request.user.teamId ?? ""), eq(users.role, "player")));
    return rows
      .map(({ user, attendance }) => ({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        jerseyNumber: user.jerseyNumber,
        position: user.position,
        status: attendance?.status ?? null,
      }))
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  });

  // Liste nominative des présences + transports — UNIQUEMENT les membres de sa propre
  // équipe : le coach adverse ne voit jamais qui sera présent en face.
  app.get("/matches/:id/attendances", { preHandler: requireRole("coach") }, async (request): Promise<AttendanceDto[]> => {
    const { id } = request.params as { id: string };
    const row = await getMatchOr404(id);
    assertCoachOfMatch(row.match, request.user.teamId);
    const rows = await db
      .select({ attendance: attendances, user: users })
      .from(attendances)
      .innerJoin(users, eq(attendances.userId, users.id))
      .where(and(eq(attendances.matchId, id), eq(users.teamId, request.user.teamId ?? "")));
    return rows.map(({ attendance, user }) => ({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: attendance.status,
      canTransport: attendance.canTransport,
      transportSeats: attendance.transportSeats,
    }));
  });

  // Présence (player : status seul ; parent : status + transport)
  app.put("/matches/:id/attendance", { preHandler: requireRole("player", "parent") }, async (request) => {
    const { id } = request.params as { id: string };
    const input = setAttendanceSchema.parse(request.body);
    if (request.user.role === "player" && (input.canTransport !== undefined || input.transportSeats !== undefined)) {
      throw new HttpError(400, "Seul un parent peut proposer un transport");
    }
    const row = await getMatchOr404(id);
    assertMemberOfMatch(row.match, request.user.teamId);
    assertAttendanceOpen(row.match);

    const canTransport = input.status === "present" && (input.canTransport ?? false);

    if (canTransport) {
      // Un parent doit avoir renseigné plaque + permis avant de proposer un covoiturage
      const [me] = await db.select().from(users).where(eq(users.id, request.user.id));
      if (!me?.licensePlate || !me?.driverLicenseNumber) {
        throw new HttpError(400, "Renseignez d'abord votre plaque d'immatriculation et votre numéro de permis");
      }
    }

    // Interdit de retirer des places déjà réservées par des joueurs
    const activeBookings = await db
      .select()
      .from(carpoolBookings)
      .where(
        and(
          eq(carpoolBookings.matchId, id),
          eq(carpoolBookings.driverId, request.user.id),
          ne(carpoolBookings.status, "declined"),
        ),
      );
    const newSeats = canTransport ? (input.transportSeats ?? 0) : 0;
    if (activeBookings.length > newSeats) {
      throw new HttpError(
        400,
        `${activeBookings.length} joueur(s) ont réservé une place dans votre voiture : impossible de descendre en dessous`,
      );
    }
    const values = {
      matchId: id,
      userId: request.user.id,
      status: input.status,
      canTransport,
      transportSeats: canTransport ? (input.transportSeats ?? 0) : 0,
      departureTime: canTransport ? (input.departureTime ?? null) : null,
      departureArea: canTransport ? (input.departureArea ?? null) : null,
      updatedAt: new Date(),
    };
    await db
      .insert(attendances)
      .values(values)
      .onConflictDoUpdate({
        target: [attendances.matchId, attendances.userId],
        set: {
          status: values.status,
          canTransport: values.canTransport,
          transportSeats: values.transportSeats,
          departureTime: values.departureTime,
          departureArea: values.departureArea,
          updatedAt: values.updatedAt,
        },
      });
    return { ok: true };
  });
}
