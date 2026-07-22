import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { createAnnouncementSchema, type AnnouncementDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { matchAnnouncements, matches, teams } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

function toDto(
  row: { announcement: typeof matchAnnouncements.$inferSelect; team: typeof teams.$inferSelect },
  myTeamId: string | null,
): AnnouncementDto {
  const { announcement, team } = row;
  return {
    id: announcement.id,
    team: { id: team.id, name: team.name, city: team.city },
    date: announcement.date,
    time: announcement.time.slice(0, 5),
    city: announcement.city,
    stadium: announcement.stadium,
    category: announcement.category,
    level: announcement.level,
    format: announcement.format,
    comment: announcement.comment,
    status: announcement.status,
    isMine: team.id === myTeamId,
    createdAt: announcement.createdAt.toISOString(),
  };
}

export function announcementRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/announcements", { preHandler: requireRole("coach") }, async (request) => {
    const { status } = request.query as { status?: string };
    const rows = await db
      .select({ announcement: matchAnnouncements, team: teams })
      .from(matchAnnouncements)
      .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
      .where(status === "open" ? eq(matchAnnouncements.status, "open") : undefined)
      .orderBy(desc(matchAnnouncements.createdAt));
    return rows.map((r) => toDto(r, request.user.teamId));
  });

  app.post("/announcements", { preHandler: requireRole("coach") }, async (request, reply) => {
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const input = createAnnouncementSchema.parse(request.body);
    const [created] = await db
      .insert(matchAnnouncements)
      .values({
        teamId: request.user.teamId,
        date: input.date,
        time: input.time,
        city: input.city,
        stadium: input.stadium,
        category: input.category,
        level: input.level,
        format: input.format,
        comment: input.comment ?? null,
      })
      .returning();
    reply.code(201);
    const [team] = await db.select().from(teams).where(eq(teams.id, request.user.teamId));
    return toDto({ announcement: created, team }, request.user.teamId);
  });

  app.delete("/announcements/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = request.params as { id: string };
    const [announcement] = await db.select().from(matchAnnouncements).where(eq(matchAnnouncements.id, id));
    if (!announcement) throw new HttpError(404, "Annonce introuvable");
    if (announcement.teamId !== request.user.teamId) throw new HttpError(403, "Cette annonce ne vous appartient pas");
    if (announcement.status !== "open") throw new HttpError(400, "Seule une annonce ouverte peut être annulée");
    await db.update(matchAnnouncements).set({ status: "cancelled" }).where(eq(matchAnnouncements.id, id));
    return { ok: true };
  });

  // Répondre à une annonce = la passer en "matched" et créer le match (transaction)
  app.post("/announcements/:id/respond", { preHandler: requireRole("coach") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const responderTeamId = request.user.teamId;
    if (!responderTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");

    const match = await db.transaction(async (tx) => {
      const [announcement] = await tx
        .select()
        .from(matchAnnouncements)
        .where(eq(matchAnnouncements.id, id))
        .for("update");
      if (!announcement) throw new HttpError(404, "Annonce introuvable");
      if (announcement.teamId === responderTeamId)
        throw new HttpError(400, "Vous ne pouvez pas répondre à votre propre annonce");
      if (announcement.status !== "open") throw new HttpError(400, "Cette annonce n'est plus disponible");

      await tx
        .update(matchAnnouncements)
        .set({ status: "matched" })
        .where(and(eq(matchAnnouncements.id, id), eq(matchAnnouncements.status, "open")));

      const [created] = await tx
        .insert(matches)
        .values({
          announcementId: announcement.id,
          homeTeamId: announcement.teamId,
          awayTeamId: responderTeamId,
          date: announcement.date,
          time: announcement.time,
          location: `${announcement.stadium}, ${announcement.city}`,
        })
        .returning();
      return created;
    });

    reply.code(201);
    return { matchId: match.id };
  });
}
