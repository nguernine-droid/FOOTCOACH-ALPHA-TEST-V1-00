import type { FastifyInstance } from "fastify";
import { and, eq, inArray, ne } from "drizzle-orm";
import type { ApprovalDto, CarpoolDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { attendances, carpoolBookings, matches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

async function getMatchOr404(id: string) {
  const [match] = await db.select().from(matches).where(eq(matches.id, id));
  if (!match) throw new HttpError(404, "Match introuvable");
  return match;
}

function assertMemberOfMatch(match: typeof matches.$inferSelect, teamId: string | null) {
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    throw new HttpError(403, "Vous n'appartenez pas à une des équipes de ce match");
  }
}

export function carpoolRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Voitures proposées pour un match : conducteurs, places restantes, réservations
  app.get("/matches/:id/carpools", async (request): Promise<CarpoolDto[]> => {
    const { id } = request.params as { id: string };
    const match = await getMatchOr404(id);
    if (request.user.role !== "supporter") assertMemberOfMatch(match, request.user.teamId);

    const drivers = await db
      .select({ attendance: attendances, driver: users })
      .from(attendances)
      .innerJoin(users, eq(attendances.userId, users.id))
      .where(and(eq(attendances.matchId, id), eq(attendances.canTransport, true)));

    const bookings = await db
      .select({ booking: carpoolBookings, player: users })
      .from(carpoolBookings)
      .innerJoin(users, eq(carpoolBookings.playerId, users.id))
      .where(and(eq(carpoolBookings.matchId, id), ne(carpoolBookings.status, "declined")));

    return drivers
      .filter(({ attendance }) => attendance.transportSeats > 0)
      .map(({ attendance, driver }) => {
        const carBookings = bookings.filter((b) => b.booking.driverId === driver.id);
        const mine = carBookings.find((b) => b.booking.playerId === request.user.id);
        return {
          driverId: driver.id,
          driverName: `${driver.firstName} ${driver.lastName}`,
          licensePlate: driver.licensePlate,
          seatsTotal: attendance.transportSeats,
          seatsRemaining: Math.max(0, attendance.transportSeats - carBookings.length),
          bookings: carBookings.map(({ booking, player }) => ({
            id: booking.id,
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            status: booking.status,
          })),
          myBooking: mine ? { id: mine.booking.id, status: mine.booking.status } : null,
        };
      });
  });

  // Un joueur réserve une place dans la voiture d'un parent
  app.post(
    "/matches/:id/carpools/:driverId/book",
    { preHandler: requireRole("player") },
    async (request, reply) => {
      const { id, driverId } = request.params as { id: string; driverId: string };
      const match = await getMatchOr404(id);
      assertMemberOfMatch(match, request.user.teamId);

      const result = await db.transaction(async (tx) => {
        const [driverAttendance] = await tx
          .select()
          .from(attendances)
          .where(and(eq(attendances.matchId, id), eq(attendances.userId, driverId), eq(attendances.canTransport, true)))
          .for("update");
        if (!driverAttendance || driverAttendance.transportSeats === 0) {
          throw new HttpError(404, "Ce covoiturage n'existe pas ou n'est plus proposé");
        }

        const existing = await tx
          .select()
          .from(carpoolBookings)
          .where(
            and(
              eq(carpoolBookings.matchId, id),
              eq(carpoolBookings.playerId, request.user.id),
              ne(carpoolBookings.status, "declined"),
            ),
          );
        if (existing.length > 0) throw new HttpError(400, "Vous avez déjà une place réservée pour ce match");

        const taken = await tx
          .select()
          .from(carpoolBookings)
          .where(
            and(
              eq(carpoolBookings.matchId, id),
              eq(carpoolBookings.driverId, driverId),
              ne(carpoolBookings.status, "declined"),
            ),
          );
        if (taken.length >= driverAttendance.transportSeats) throw new HttpError(400, "Cette voiture est complète");

        // Si le joueur a un parent assigné, la réservation attend sa validation
        const [player] = await tx.select().from(users).where(eq(users.id, request.user.id));
        const status = player?.parentId ? "pending" : "approved";
        const [created] = await tx
          .insert(carpoolBookings)
          .values({ matchId: id, driverId, playerId: request.user.id, status })
          .returning();
        return created;
      });

      reply.code(201);
      return { id: result.id, status: result.status };
    },
  );

  // Le joueur annule sa réservation
  app.delete("/bookings/:bookingId", { preHandler: requireRole("player") }, async (request) => {
    const { bookingId } = request.params as { bookingId: string };
    const [booking] = await db.select().from(carpoolBookings).where(eq(carpoolBookings.id, bookingId));
    if (!booking || booking.playerId !== request.user.id) throw new HttpError(404, "Réservation introuvable");
    await db.delete(carpoolBookings).where(eq(carpoolBookings.id, bookingId));
    return { ok: true };
  });

  // Demandes en attente pour les joueurs dont je suis le parent assigné
  app.get("/me/approvals", { preHandler: requireRole("parent") }, async (request): Promise<ApprovalDto[]> => {
    const children = await db.select().from(users).where(eq(users.parentId, request.user.id));
    if (children.length === 0) return [];
    const childIds = children.map((c) => c.id);

    const rows = await db
      .select({ booking: carpoolBookings, driver: users, match: matches })
      .from(carpoolBookings)
      .innerJoin(users, eq(carpoolBookings.driverId, users.id))
      .innerJoin(matches, eq(carpoolBookings.matchId, matches.id))
      .where(inArray(carpoolBookings.playerId, childIds));

    const teamRows = await db.select().from(teams);
    const teamName = (teamId: string) => teamRows.find((t) => t.id === teamId)?.name ?? "?";

    return rows.map(({ booking, driver, match }) => {
      const child = children.find((c) => c.id === booking.playerId);
      return {
        id: booking.id,
        playerName: child ? `${child.firstName} ${child.lastName}` : "?",
        driverName: `${driver.firstName} ${driver.lastName}`,
        licensePlate: driver.licensePlate,
        matchLabel: `${teamName(match.homeTeamId)} vs ${teamName(match.awayTeamId)}`,
        matchDate: match.date,
        status: booking.status,
      };
    });
  });

  // Le parent assigné valide ou refuse la réservation de son joueur
  app.post("/bookings/:bookingId/:decision", { preHandler: requireRole("parent") }, async (request) => {
    const { bookingId, decision } = request.params as { bookingId: string; decision: string };
    if (decision !== "approve" && decision !== "decline") throw new HttpError(400, "Décision invalide");

    const [booking] = await db.select().from(carpoolBookings).where(eq(carpoolBookings.id, bookingId));
    if (!booking) throw new HttpError(404, "Réservation introuvable");
    const [player] = await db.select().from(users).where(eq(users.id, booking.playerId));
    if (!player || player.parentId !== request.user.id) {
      throw new HttpError(403, "Vous n'êtes pas le parent assigné de ce joueur");
    }
    if (booking.status !== "pending") throw new HttpError(400, "Cette demande a déjà été traitée");

    await db
      .update(carpoolBookings)
      .set({ status: decision === "approve" ? "approved" : "declined" })
      .where(eq(carpoolBookings.id, bookingId));
    return { ok: true };
  });
}
