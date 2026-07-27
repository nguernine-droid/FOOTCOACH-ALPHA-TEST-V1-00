import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import {
  createAnnouncementSchema,
  daysBetweenIso,
  type AnnouncementDto,
  type AnnouncementResponseDto,
  type TeamDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { announcementResponses, matchAnnouncements, matches, teams } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { bearingDeg, cityCoords, haversineKm } from "../lib/cities.js";

function toDto(
  row: { announcement: typeof matchAnnouncements.$inferSelect; team: typeof teams.$inferSelect },
  myTeamId: string | null,
  link?: { matchId: string; opponentTeam: TeamDto },
  myCoords?: { lat: number; lng: number } | null,
  responses?: AnnouncementResponseDto[],
  myResponseStatus?: AnnouncementResponseDto["status"] | null,
): AnnouncementDto {
  const { announcement, team } = row;
  // Position relative du LIEU DU MATCH, pas du siège du club : une annonce
  // peut se jouer loin de la ville de l'équipe qui la publie, et c'est le
  // déplacement réel qui intéresse le coach. `null` si la ville du match est
  // absente de l'annuaire — mieux vaut ne rien annoncer qu'une fausse distance.
  const venueCoords = team.id !== myTeamId ? cityCoords(announcement.city) : null;
  const distanceKm = myCoords && venueCoords ? haversineKm(myCoords, venueCoords) : null;
  const bearing = myCoords && venueCoords ? bearingDeg(myCoords, venueCoords) : null;
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
    federationDeclared: announcement.federationDeclared,
    noticeDays: daysBetweenIso(announcement.createdAt.toISOString().slice(0, 10), announcement.date),
    matchId: link?.matchId ?? null,
    opponentTeam: link?.opponentTeam ?? null,
    distanceKm,
    bearingDeg: bearing,
    responses: responses ?? [],
    myResponseStatus: myResponseStatus ?? null,
  };
}

/** Pour les annonces matchées : match créé + équipe qui a répondu, indexés par annonce */
async function loadMatchLinks(announcementIds: string[]) {
  const links = new Map<string, { matchId: string; opponentTeam: TeamDto }>();
  if (announcementIds.length === 0) return links;
  const rows = await db
    .select({ match: matches, opponent: teams })
    .from(matches)
    .innerJoin(teams, eq(matches.awayTeamId, teams.id))
    .where(inArray(matches.announcementId, announcementIds));
  for (const { match, opponent } of rows) {
    links.set(match.announcementId, {
      matchId: match.id,
      opponentTeam: { id: opponent.id, name: opponent.name, city: opponent.city },
    });
  }
  return links;
}

/** Propositions (avec équipe) indexées par annonce */
async function loadResponses(announcementIds: string[]) {
  const byAnnouncement = new Map<string, (AnnouncementResponseDto & { teamId: string })[]>();
  if (announcementIds.length === 0) return byAnnouncement;
  const rows = await db
    .select({ response: announcementResponses, team: teams })
    .from(announcementResponses)
    .innerJoin(teams, eq(announcementResponses.teamId, teams.id))
    .where(inArray(announcementResponses.announcementId, announcementIds))
    .orderBy(desc(announcementResponses.createdAt));
  for (const { response, team } of rows) {
    const list = byAnnouncement.get(response.announcementId) ?? [];
    list.push({
      id: response.id,
      team: { id: team.id, name: team.name, city: team.city },
      status: response.status,
      createdAt: response.createdAt.toISOString(),
      teamId: team.id,
    });
    byAnnouncement.set(response.announcementId, list);
  }
  return byAnnouncement;
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
    const links = await loadMatchLinks(
      rows.filter((r) => r.announcement.status === "matched").map((r) => r.announcement.id),
    );
    const responsesByAnn = await loadResponses(rows.map((r) => r.announcement.id));
    const [myTeam] = request.user.teamId
      ? await db.select().from(teams).where(eq(teams.id, request.user.teamId))
      : [];
    const myCoords = myTeam?.lat != null && myTeam?.lng != null ? { lat: myTeam.lat, lng: myTeam.lng } : null;
    return rows.map((r) => {
      const all = responsesByAnn.get(r.announcement.id) ?? [];
      const isMine = r.announcement.teamId === request.user.teamId;
      // L'émetteur voit les propositions reçues ; un visiteur ne voit que la sienne.
      const responses = isMine ? all.map(({ teamId: _teamId, ...dto }) => dto) : [];
      const myResponseStatus = isMine ? null : (all.find((x) => x.teamId === request.user.teamId)?.status ?? null);
      return toDto(r, request.user.teamId, links.get(r.announcement.id), myCoords, responses, myResponseStatus);
    });
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
        federationDeclared: input.federationDeclared,
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

  // Proposer de jouer : crée une proposition en attente. L'annonce RESTE ouverte
  // (visible au radar) tant que le coach émetteur n'a pas accepté une proposition.
  app.post("/announcements/:id/respond", { preHandler: requireRole("coach") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const responderTeamId = request.user.teamId;
    if (!responderTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");

    const [announcement] = await db.select().from(matchAnnouncements).where(eq(matchAnnouncements.id, id));
    if (!announcement) throw new HttpError(404, "Annonce introuvable");
    if (announcement.teamId === responderTeamId)
      throw new HttpError(400, "Vous ne pouvez pas répondre à votre propre annonce");
    if (announcement.status !== "open") throw new HttpError(400, "Cette annonce n'est plus disponible");

    const [existing] = await db
      .select()
      .from(announcementResponses)
      .where(and(eq(announcementResponses.announcementId, id), eq(announcementResponses.teamId, responderTeamId)));
    if (existing) throw new HttpError(400, "Vous avez déjà proposé de jouer sur cette annonce");

    const [created] = await db
      .insert(announcementResponses)
      .values({ announcementId: id, teamId: responderTeamId })
      .returning();
    reply.code(201);
    return { responseId: created.id };
  });

  // Le coach émetteur accepte une proposition : l'annonce passe en "matched",
  // le match est créé et les autres propositions en attente sont déclinées.
  app.post(
    "/announcements/:id/responses/:responseId/accept",
    { preHandler: requireRole("coach") },
    async (request, reply) => {
      const { id, responseId } = request.params as { id: string; responseId: string };

      const match = await db.transaction(async (tx) => {
        const [announcement] = await tx
          .select()
          .from(matchAnnouncements)
          .where(eq(matchAnnouncements.id, id))
          .for("update");
        if (!announcement) throw new HttpError(404, "Annonce introuvable");
        if (announcement.teamId !== request.user.teamId)
          throw new HttpError(403, "Cette annonce ne vous appartient pas");
        if (announcement.status !== "open") throw new HttpError(400, "Cette annonce n'est plus ouverte");

        const [response] = await tx
          .select()
          .from(announcementResponses)
          .where(and(eq(announcementResponses.id, responseId), eq(announcementResponses.announcementId, id)));
        if (!response) throw new HttpError(404, "Proposition introuvable");
        if (response.status !== "pending") throw new HttpError(400, "Cette proposition n'est plus en attente");

        await tx.update(matchAnnouncements).set({ status: "matched" }).where(eq(matchAnnouncements.id, id));
        await tx
          .update(announcementResponses)
          .set({ status: "accepted" })
          .where(eq(announcementResponses.id, responseId));
        await tx
          .update(announcementResponses)
          .set({ status: "declined" })
          .where(
            and(
              eq(announcementResponses.announcementId, id),
              ne(announcementResponses.id, responseId),
              eq(announcementResponses.status, "pending"),
            ),
          );

        const [created] = await tx
          .insert(matches)
          .values({
            announcementId: announcement.id,
            homeTeamId: announcement.teamId,
            awayTeamId: response.teamId,
            date: announcement.date,
            time: announcement.time,
            location: `${announcement.stadium}, ${announcement.city}`,
          })
          .returning();
        return created;
      });

      reply.code(201);
      return { matchId: match.id };
    },
  );

  // Le coach émetteur décline une proposition ; l'annonce reste ouverte.
  app.post(
    "/announcements/:id/responses/:responseId/decline",
    { preHandler: requireRole("coach") },
    async (request) => {
      const { id, responseId } = request.params as { id: string; responseId: string };
      const [announcement] = await db.select().from(matchAnnouncements).where(eq(matchAnnouncements.id, id));
      if (!announcement) throw new HttpError(404, "Annonce introuvable");
      if (announcement.teamId !== request.user.teamId)
        throw new HttpError(403, "Cette annonce ne vous appartient pas");

      const [response] = await db
        .select()
        .from(announcementResponses)
        .where(and(eq(announcementResponses.id, responseId), eq(announcementResponses.announcementId, id)));
      if (!response) throw new HttpError(404, "Proposition introuvable");
      if (response.status !== "pending") throw new HttpError(400, "Cette proposition n'est plus en attente");

      await db
        .update(announcementResponses)
        .set({ status: "declined" })
        .where(eq(announcementResponses.id, responseId));
      return { ok: true };
    },
  );
}
