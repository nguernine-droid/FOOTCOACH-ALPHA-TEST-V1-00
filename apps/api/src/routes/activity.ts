import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { ActivityDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { attendances, carpoolBookings, matchAnnouncements, matches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

const FEED_LIMIT = 15;

// Fil d'activité du coach, dérivé des tables existantes (aucune table dédiée) :
// présences de son équipe, réservations de covoiturage, annonces acceptées.
export function activityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("coach"));

  app.get("/activity", async (request): Promise<ActivityDto[]> => {
    const teamId = request.user.teamId;
    if (!teamId) throw new HttpError(400, "Aucune équipe associée");

    const teamMatches = await db
      .select()
      .from(matches)
      .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)));
    const matchIds = teamMatches.map((m) => m.id);
    const opponentName = (m: (typeof teamMatches)[number], opponents: Map<string, string>) =>
      opponents.get(m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId) ?? "l'adversaire";

    const opponentRows = matchIds.length
      ? await db
          .select()
          .from(teams)
          .where(
            inArray(
              teams.id,
              teamMatches.map((m) => (m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId)),
            ),
          )
      : [];
    const opponents = new Map(opponentRows.map((t) => [t.id, t.name]));
    const matchById = new Map(teamMatches.map((m) => [m.id, m]));

    const events: ActivityDto[] = [];

    // 1. Réponses de présence des membres de mon équipe
    if (matchIds.length) {
      const rows = await db
        .select({ attendance: attendances, member: users })
        .from(attendances)
        .innerJoin(users, eq(attendances.userId, users.id))
        .where(and(inArray(attendances.matchId, matchIds), eq(users.teamId, teamId)))
        .orderBy(desc(attendances.updatedAt))
        .limit(FEED_LIMIT);
      for (const { attendance, member } of rows) {
        const match = matchById.get(attendance.matchId);
        if (!match) continue;
        events.push({
          id: `att-${attendance.id}`,
          type: "attendance",
          actor: `${member.firstName} ${member.lastName}`,
          detail:
            attendance.status === "present"
              ? `a confirmé sa présence face à ${opponentName(match, opponents)}`
              : `s'est déclaré absent face à ${opponentName(match, opponents)}`,
          createdAt: attendance.updatedAt.toISOString(),
        });
      }
    }

    // 2. Réservations de covoiturage des joueurs de mon équipe
    if (matchIds.length) {
      const rows = await db
        .select({ booking: carpoolBookings, player: users })
        .from(carpoolBookings)
        .innerJoin(users, eq(carpoolBookings.playerId, users.id))
        .where(and(inArray(carpoolBookings.matchId, matchIds), eq(users.teamId, teamId)))
        .orderBy(desc(carpoolBookings.createdAt))
        .limit(FEED_LIMIT);
      const driverIds = [...new Set(rows.map((r) => r.booking.driverId))];
      const drivers = driverIds.length
        ? await db.select().from(users).where(inArray(users.id, driverIds))
        : [];
      const driverById = new Map(drivers.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
      for (const { booking, player } of rows) {
        events.push({
          id: `car-${booking.id}`,
          type: "carpool",
          actor: `${player.firstName} ${player.lastName}`,
          detail:
            booking.status === "approved"
              ? `a une place validée dans la voiture de ${driverById.get(booking.driverId) ?? "un parent"}`
              : booking.status === "declined"
                ? `s'est vu refuser la voiture de ${driverById.get(booking.driverId) ?? "un parent"}`
                : `a demandé une place dans la voiture de ${driverById.get(booking.driverId) ?? "un parent"}`,
          createdAt: booking.createdAt.toISOString(),
        });
      }
    }

    // 3. Mes annonces acceptées par un autre coach
    const answered = await db
      .select({ match: matches, opponent: teams, announcement: matchAnnouncements })
      .from(matches)
      .innerJoin(matchAnnouncements, eq(matches.announcementId, matchAnnouncements.id))
      .innerJoin(teams, eq(matches.awayTeamId, teams.id))
      .where(eq(matchAnnouncements.teamId, teamId))
      .orderBy(desc(matches.createdAt))
      .limit(FEED_LIMIT);
    for (const { match, opponent, announcement } of answered) {
      events.push({
        id: `ann-${match.id}`,
        type: "announcement",
        actor: opponent.name,
        detail: `a accepté votre annonce ${announcement.category} du ${new Date(`${match.date}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
        createdAt: match.createdAt.toISOString(),
      });
    }

    return events
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, FEED_LIMIT);
  });
}
