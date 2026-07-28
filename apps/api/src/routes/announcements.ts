import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, inArray, ne, notInArray } from "drizzle-orm";
import {
  createAnnouncementSchema,
  daysBetweenIso,
  MATCH_GENDER_LABELS,
  type AnnouncementDto,
  type AnnouncementResponseDto,
  type RadarDto,
  type TeamDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { announcementResponses, matchAnnouncements, matches, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { bearingDeg, cityCoords, haversineKm } from "../lib/cities.js";
import { loadOrigin } from "../lib/coachOrigin.js";
import { notifyNewAnnouncement, notifyAnnouncementResponse, notifyResponseDecision } from "../lib/push.js";

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
    gender: announcement.gender,
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
    isSos: announcement.isSos,
    sosReason: announcement.sosReason,
    sosDetails: announcement.sosDetails,
  };
}

/**
 * Pour les annonces matchées : match créé + équipe qui a répondu, indexés par
 * annonce. Les matchs annulés sont écartés — une annonce peut en compter un
 * après un désistement, mais c'est le match en cours qui la décrit.
 */
async function loadMatchLinks(announcementIds: string[]) {
  const links = new Map<string, { matchId: string; opponentTeam: TeamDto }>();
  if (announcementIds.length === 0) return links;
  const rows = await db
    .select({ match: matches, opponent: teams })
    .from(matches)
    .innerJoin(teams, eq(matches.awayTeamId, teams.id))
    .where(and(inArray(matches.announcementId, announcementIds), ne(matches.status, "cancelled")));
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

/**
 * Les équipes qui partagent au moins un encadrant avec celle-ci, elle comprise.
 *
 * Un coach en encadre parfois deux, et un adjoint peut l'être ailleurs : ces
 * équipes-là ne peuvent pas se rencontrer, faute de quoi le même homme se
 * retrouverait sur les deux bancs. La règle porte sur les ÉQUIPES et non sur
 * celui qui agit — sinon un second coach de l'équipe suffirait à la contourner.
 */
async function teamsSharingCoachWith(teamId: string): Promise<string[]> {
  const staff = await db
    .select({ coachId: teamCoaches.coachId })
    .from(teamCoaches)
    .where(eq(teamCoaches.teamId, teamId));
  if (staff.length === 0) return [teamId];
  const rows = await db
    .select({ teamId: teamCoaches.teamId })
    .from(teamCoaches)
    .where(
      inArray(
        teamCoaches.coachId,
        staff.map((s) => s.coachId),
      ),
    );
  return [...new Set([teamId, ...rows.map((r) => r.teamId)])];
}

/**
 * Date du jour au format ISO. Une annonce dont la date est dépassée ne cherche
 * plus personne : le match n'aura pas lieu. Elle disparaît du radar et n'accepte
 * plus de proposition, sans changer de statut — son émetteur la retrouve dans
 * « Mes annonces », qui reste l'historique complet.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function announcementRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /**
   * Mes annonces, tous statuts confondus : l'écran « Annonces » et le tableau
   * de bord. Avec les propositions reçues, que seul l'émetteur voit.
   */
  app.get("/announcements/mine", { preHandler: requireRole("coach") }, async (request): Promise<AnnouncementDto[]> => {
    const myTeamId = request.user.teamId;
    if (!myTeamId) return [];
    const rows = await db
      .select({ announcement: matchAnnouncements, team: teams })
      .from(matchAnnouncements)
      .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
      .where(eq(matchAnnouncements.teamId, myTeamId))
      .orderBy(desc(matchAnnouncements.createdAt));

    const links = await loadMatchLinks(
      rows.filter((r) => r.announcement.status === "matched").map((r) => r.announcement.id),
    );
    const responsesByAnn = await loadResponses(rows.map((r) => r.announcement.id));
    return rows.map((r) => {
      const responses = (responsesByAnn.get(r.announcement.id) ?? []).map(({ teamId: _teamId, ...dto }) => dto);
      return toDto(r, myTeamId, links.get(r.announcement.id), null, responses, null);
    });
  });

  /**
   * Le radar : les annonces des AUTRES équipes, encore jouables et dans le
   * périmètre du coach.
   *
   * Le filtrage se fait ici et non chez le client. Servir toutes les annonces
   * de la plateforme pour n'en afficher qu'une poignée faisait grossir la
   * réponse sans limite — l'historique d'une saison entière téléchargé à chaque
   * ouverture du tableau de bord.
   *
   * Une annonce dont la ville est absente de l'annuaire n'est jamais écartée :
   * on ne peut pas affirmer qu'elle est hors périmètre, seulement qu'on ne sait
   * pas. `beyondRadius` compte celles que le périmètre a mises de côté, pour
   * que le client puisse proposer de balayer sans limite sans mentir sur le
   * nombre.
   */
  app.get("/announcements/radar", { preHandler: requireRole("coach") }, async (request): Promise<RadarDto> => {
    const myTeamId = request.user.teamId;
    // Écarte mes annonces, mais aussi celles de mes autres équipes et de celles
    // qui partagent un encadrant avec la mienne : un match qu'on ne peut pas
    // jouer n'a rien à faire sur le radar.
    const unplayable = myTeamId ? await teamsSharingCoachWith(myTeamId) : [];
    const rows = await db
      .select({ announcement: matchAnnouncements, team: teams })
      .from(matchAnnouncements)
      .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
      .where(
        and(
          eq(matchAnnouncements.status, "open"),
          gte(matchAnnouncements.date, today()),
          unplayable.length > 0 ? notInArray(matchAnnouncements.teamId, unplayable) : undefined,
        ),
      )
      .orderBy(desc(matchAnnouncements.createdAt));

    // Position réglée par le coach en priorité, ville de son équipe en repli
    const myCoords = await loadOrigin(request.user.id, myTeamId);
    const [me] = await db.select({ radiusKm: users.radarRadiusKm }).from(users).where(eq(users.id, request.user.id));
    const radiusKm = me?.radiusKm ?? null;

    // Seules mes propositions me concernent ici : celles des autres équipes
    // n'ont pas à quitter le serveur.
    const myResponses = myTeamId
      ? await db
          .select({ announcementId: announcementResponses.announcementId, status: announcementResponses.status })
          .from(announcementResponses)
          .where(eq(announcementResponses.teamId, myTeamId))
      : [];
    const myStatusByAnn = new Map(myResponses.map((r) => [r.announcementId, r.status]));

    const items: AnnouncementDto[] = [];
    let beyondRadius = 0;
    for (const row of rows) {
      const dto = toDto(row, myTeamId, undefined, myCoords, [], myStatusByAnn.get(row.announcement.id) ?? null);
      if (radiusKm !== null && dto.distanceKm !== null && dto.distanceKm > radiusKm) beyondRadius++;
      else items.push(dto);
    }
    return { items, beyondRadius };
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
        gender: input.gender,
        level: input.level,
        format: input.format,
        comment: input.comment ?? null,
        federationDeclared: input.federationDeclared,
      })
      .returning();
    reply.code(201);
    const [team] = await db.select().from(teams).where(eq(teams.id, request.user.teamId));
    // Alerte les coachs dont le périmètre couvre le lieu du match (sans attendre)
    notifyNewAnnouncement({
      authorUserId: request.user.id,
      teamName: team.name,
      // Le genre suit la catégorie : un coach d'équipe féminine doit voir en
      // un coup d'œil si l'annonce le concerne.
      category: created.gender ? `${created.category} ${MATCH_GENDER_LABELS[created.gender]}` : created.category,
      format: created.format,
      city: created.city,
      venue: cityCoords(created.city),
    });
    return toDto({ announcement: created, team }, request.user.teamId);
  });

  app.delete("/announcements/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = request.params as { id: string };
    const [announcement] = await db.select().from(matchAnnouncements).where(eq(matchAnnouncements.id, id));
    if (!announcement) throw new HttpError(404, "Annonce introuvable");
    if (announcement.teamId !== request.user.teamId) throw new HttpError(403, "Cette annonce ne vous appartient pas");
    if (announcement.status !== "open") throw new HttpError(400, "Seule une annonce ouverte peut être annulée");
    await db
      .update(matchAnnouncements)
      .set({ status: "cancelled", isSos: false, sosReason: null, sosDetails: null })
      .where(eq(matchAnnouncements.id, id));
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
    // Le radar masque déjà ces annonces ; ce refus vaut pour tout le reste —
    // une proposition envoyée avant un changement d'équipe, un appel direct.
    if ((await teamsSharingCoachWith(responderTeamId)).includes(announcement.teamId)) {
      throw new HttpError(400, "Vous encadrez l'équipe qui publie cette annonce");
    }
    if (announcement.status !== "open") throw new HttpError(400, "Cette annonce n'est plus disponible");
    if (announcement.date < today()) throw new HttpError(400, "La date de ce match est passée");

    const [existing] = await db
      .select()
      .from(announcementResponses)
      .where(and(eq(announcementResponses.announcementId, id), eq(announcementResponses.teamId, responderTeamId)));
    if (existing) throw new HttpError(400, "Vous avez déjà proposé de jouer sur cette annonce");

    const [created] = await db
      .insert(announcementResponses)
      .values({ announcementId: id, teamId: responderTeamId })
      .returning();

    const [responderTeam] = await db.select().from(teams).where(eq(teams.id, responderTeamId));
    notifyAnnouncementResponse({
      ownerTeamId: announcement.teamId,
      responderTeamName: responderTeam.name,
      city: announcement.city,
    });

    reply.code(201);
    return { responseId: created.id };
  });

  /**
   * Se désister avant acceptation : le coach retire la proposition qu'il a
   * envoyée. La ligne est supprimée plutôt que marquée — l'annonce reste
   * ouverte, et rien n'interdit de reproposer plus tard.
   */
  app.delete("/announcements/:id/respond", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = request.params as { id: string };
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");

    const [response] = await db
      .select()
      .from(announcementResponses)
      .where(
        and(eq(announcementResponses.announcementId, id), eq(announcementResponses.teamId, request.user.teamId)),
      );
    if (!response) throw new HttpError(404, "Vous n'avez pas de proposition sur cette annonce");
    if (response.status !== "pending")
      throw new HttpError(400, "Cette proposition a déjà été traitée par le coach");

    await db.delete(announcementResponses).where(eq(announcementResponses.id, response.id));
    return { ok: true };
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
        if (announcement.date < today())
          throw new HttpError(400, "La date de ce match est passée : l'annonce ne peut plus être confirmée");

        const [response] = await tx
          .select()
          .from(announcementResponses)
          .where(and(eq(announcementResponses.id, responseId), eq(announcementResponses.announcementId, id)));
        if (!response) throw new HttpError(404, "Proposition introuvable");
        if (response.status !== "pending") throw new HttpError(400, "Cette proposition n'est plus en attente");
        // Dernier verrou avant que le match n'existe : une proposition reçue
        // avant que les deux équipes ne partagent un encadrant serait acceptable
        // ici alors qu'elle ne l'est plus.
        if ((await teamsSharingCoachWith(announcement.teamId)).includes(response.teamId)) {
          throw new HttpError(400, "Vous encadrez aussi l'équipe qui a proposé : ce match ne peut pas se jouer");
        }

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

      // Prévient l'équipe retenue, et celles dont la proposition vient de tomber
      const [ownTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId));
      const declined = await db
        .select({ teamId: announcementResponses.teamId })
        .from(announcementResponses)
        .where(and(eq(announcementResponses.announcementId, id), eq(announcementResponses.status, "declined")));
      notifyResponseDecision({
        responderTeamId: match.awayTeamId,
        accepted: true,
        opponentTeamName: ownTeam.name,
        matchId: match.id,
      });
      for (const { teamId } of declined) {
        notifyResponseDecision({
          responderTeamId: teamId,
          accepted: false,
          opponentTeamName: ownTeam.name,
          matchId: null,
        });
      }

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

      const [ownTeam] = await db.select().from(teams).where(eq(teams.id, announcement.teamId));
      notifyResponseDecision({
        responderTeamId: response.teamId,
        accepted: false,
        opponentTeamName: ownTeam.name,
        matchId: null,
      });
      return { ok: true };
    },
  );
}
