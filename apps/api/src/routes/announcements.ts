import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, inArray, ne, notInArray, sql } from "drizzle-orm";
import {
  idParamSchema,
  responseParamsSchema,
  categoryLabel,
  createAnnouncementSchema,
  isPlateauCategory,
  PLATEAU_TEAMS_WANTED,
  MATCH_GENDER_LABELS,
  type AnnouncementDto,
  type AnnouncementResponseDto,
  type CoachRefDto,
  type MatchGender,
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
import { tournamentsInRadar } from "./tournaments.js";
import { representativeCoachOf, representativeCoachesOf } from "../lib/coachCard.js";
import { markRead, openConversation, postSystemMessage } from "../lib/conversations.js";

function toDto(
  row: { announcement: typeof matchAnnouncements.$inferSelect; team: typeof teams.$inferSelect },
  myTeamId: string | null,
  link?: { matchId: string; opponentTeam: TeamDto },
  myCoords?: { lat: number; lng: number } | null,
  responses?: AnnouncementResponseDto[],
  myResponseStatus?: AnnouncementResponseDto["status"] | null,
  /** Coach représentant l'équipe émettrice, quand l'appelant l'a chargé */
  coach?: CoachRefDto | null,
  /** Acceptées déjà comptées par l'appelant (radar) — sinon relues des propositions */
  acceptedCount?: number,
): AnnouncementDto {
  const { announcement, team } = row;
  const plateau = isPlateauCategory(announcement.category);
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
    plateau,
    teamsWanted: plateau ? PLATEAU_TEAMS_WANTED : 1,
    teamsAccepted: acceptedCount ?? (responses ?? []).filter((r) => r.status === "accepted").length,
    coach: coach ?? null,
    createdAt: announcement.createdAt.toISOString(),
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
 * Le message que l'application inscrit dans le fil des deux coachs quand un
 * match est convenu.
 *
 * Il dit CE QUI a été convenu, pas seulement qu'on s'est mis d'accord : deux
 * coachs ont parfois plusieurs matchs ensemble, et plusieurs annonces peuvent
 * être acceptées le même jour — un fil qui ne porterait qu'un nom laisserait
 * exactement la question « qui est qui, pour quel match ? ».
 *
 * Trois lignes, dans l'ordre où l'on cherche : de quoi il s'agit, quand et où,
 * puis qui reçoit qui. Le texte est FIGÉ à l'écriture — il raconte l'accord de
 * ce jour-là ; la feuille de match, elle, dit l'état actuel (voir `matchId`).
 *
 * ⚠ La reprise de l'existant (migration 0030) réécrit ce texte en SQL : les
 * deux doivent rester identiques, sans quoi les anciens fils ne ressembleraient
 * pas aux nouveaux.
 */
function matchSystemMessage(input: {
  category: string;
  gender: MatchGender | null;
  format: string;
  date: string;
  time: string;
  location: string;
  homeTeamName: string;
  awayTeamName: string;
}): string {
  const day = new Date(`${input.date}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  const category = `${categoryLabel(input.category)}${
    input.gender ? ` ${MATCH_GENDER_LABELS[input.gender]}` : ""
  }`;
  // Jusqu'aux U11 c'est un plateau qui se confirme, pas un match : le fil doit
  // employer le mot que les deux coachs emploieront au bord du terrain.
  const confirmed = isPlateauCategory(input.category) ? "Plateau confirmé" : "Match confirmé";
  return [
    `${confirmed} — ${category} · ${input.format}`,
    `${day} à ${input.time.slice(0, 5)} · ${input.location}`,
    `${input.homeTeamName} reçoit ${input.awayTeamName}`,
  ].join("\n");
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
    const coaches = await representativeCoachesOf(rows.map((r) => r.team.id));
    return rows.map((r) => {
      const responses = (responsesByAnn.get(r.announcement.id) ?? []).map(({ teamId: _teamId, ...dto }) => dto);
      return toDto(r, myTeamId, links.get(r.announcement.id), null, responses, null, coaches.get(r.team.id));
    });
  });

  /**
   * Détail d'une annonce — l'écran qu'on ouvre depuis le radar avant de
   * proposer un match. Il porte la carte du coach émetteur : publier, c'est se
   * montrer, et l'on choisit plus volontiers un adversaire dont on voit qui il
   * est.
   *
   * Lisible par tout coach : une annonce est faite pour être vue. Les
   * propositions reçues, elles, restent à son seul émetteur — c'est son
   * information, pas celle des candidats.
   */
  app.get("/announcements/:id", { preHandler: requireRole("coach") }, async (request): Promise<AnnouncementDto> => {
    const { id } = idParamSchema.parse(request.params);
    const [row] = await db
      .select({ announcement: matchAnnouncements, team: teams })
      .from(matchAnnouncements)
      .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
      .where(eq(matchAnnouncements.id, id));
    if (!row) throw new HttpError(404, "Annonce introuvable");

    const myTeamId = request.user.teamId;
    const isMine = row.team.id === myTeamId;
    const links = await loadMatchLinks([id]);
    const all = (await loadResponses([id])).get(id) ?? [];
    const responses = isMine ? all.map(({ teamId: _teamId, ...dto }) => dto) : [];
    const myStatus = myTeamId ? (all.find((r) => r.teamId === myTeamId)?.status ?? null) : null;
    // Compté à part : un visiteur ne reçoit pas les propositions, mais les
    // places restantes d'un plateau le concernent au premier chef.
    const acceptedCount = all.filter((r) => r.status === "accepted").length;
    const myCoords = await loadOrigin(request.user.id, myTeamId);
    const coaches = await representativeCoachesOf([row.team.id]);
    return toDto(row, myTeamId, links.get(id), myCoords, responses, myStatus, coaches.get(row.team.id), acceptedCount);
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

    // Places prises des plateaux encore ouverts : une annonce à 4 équipes reste
    // au radar après une première acceptation, il faut dire ce qui reste.
    const acceptedCounts = new Map<string, number>();
    if (rows.length > 0) {
      const counts = await db
        .select({ announcementId: announcementResponses.announcementId, count: sql<number>`count(*)::int` })
        .from(announcementResponses)
        .where(
          and(
            inArray(announcementResponses.announcementId, rows.map((r) => r.announcement.id)),
            eq(announcementResponses.status, "accepted"),
          ),
        )
        .groupBy(announcementResponses.announcementId);
      for (const c of counts) acceptedCounts.set(c.announcementId, c.count);
    }

    const coaches = await representativeCoachesOf(rows.map((r) => r.team.id));
    const items: AnnouncementDto[] = [];
    let beyondRadius = 0;
    for (const row of rows) {
      const dto = toDto(
        row,
        myTeamId,
        undefined,
        myCoords,
        [],
        myStatusByAnn.get(row.announcement.id) ?? null,
        coaches.get(row.team.id),
        acceptedCounts.get(row.announcement.id) ?? 0,
      );
      if (radiusKm !== null && dto.distanceKm !== null && dto.distanceKm > radiusKm) beyondRadius++;
      else items.push(dto);
    }

    // Les tournois du même périmètre voyagent avec le radar : le coach y
    // cherche « quoi jouer », et un tournoi est une occasion de jouer autant
    // qu'une annonce. Servis à part, parce qu'ils ne portent ni les mêmes
    // champs ni les mêmes actions.
    const tournamentItems = await tournamentsInRadar(myTeamId, unplayable, myCoords, radiusKm);
    return { items, tournaments: tournamentItems, beyondRadius };
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
        // federationDeclared n'est plus renseigné : voir le commentaire de la
        // colonne dans db/schema.ts. L'acceptation vit désormais sur le compte.
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
    const { id } = idParamSchema.parse(request.params);
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
    const { id } = idParamSchema.parse(request.params);
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
      .values({ announcementId: id, teamId: responderTeamId, coachId: request.user.id })
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
    const { id } = idParamSchema.parse(request.params);
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
      const { id, responseId } = responseParamsSchema.parse(request.params);

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

        await tx
          .update(announcementResponses)
          .set({ status: "accepted" })
          .where(eq(announcementResponses.id, responseId));

        /**
         * Un amical se pourvoit à la première acceptation ; un plateau (≤ U11)
         * cherche TROIS équipes et reste donc ouvert — et au radar — jusqu'à la
         * troisième. Les propositions restantes ne tombent qu'une fois le
         * plateau complet : les décliner avant reviendrait à refuser des
         * équipes qu'on cherche encore.
         */
        const teamsWanted = isPlateauCategory(announcement.category) ? PLATEAU_TEAMS_WANTED : 1;
        const [{ count: acceptedCount }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(announcementResponses)
          .where(
            and(eq(announcementResponses.announcementId, id), eq(announcementResponses.status, "accepted")),
          );
        const full = acceptedCount >= teamsWanted;
        let declinedTeamIds: string[] = [];
        if (full) {
          const pendings = await tx
            .select({ teamId: announcementResponses.teamId })
            .from(announcementResponses)
            .where(
              and(eq(announcementResponses.announcementId, id), eq(announcementResponses.status, "pending")),
            );
          declinedTeamIds = pendings.map((p) => p.teamId);
          await tx
            .update(announcementResponses)
            .set({ status: "declined" })
            .where(
              and(eq(announcementResponses.announcementId, id), eq(announcementResponses.status, "pending")),
            );
          await tx.update(matchAnnouncements).set({ status: "matched" }).where(eq(matchAnnouncements.id, id));
        }

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

        /**
         * Le match convenu ouvre la conversation entre les deux coachs. Dans la
         * même transaction que le match : un match sans fil obligerait à
         * s'échanger un numéro pour convenir de l'heure exacte, ce que
         * l'acceptation était précisément censée éviter.
         *
         * Deux personnes, pas deux équipes : celui qui vient d'accepter, et
         * celui qui a proposé — à défaut (proposition antérieure à cette
         * colonne) le coach qui représente l'équipe candidate.
         */
        const responderCoachId = response.coachId ?? (await representativeCoachOf(response.teamId))?.id ?? null;
        if (responderCoachId) {
          const conversationId = await openConversation(tx, request.user.id, responderCoachId, created.id);
          if (conversationId) {
            const [homeTeam, awayTeam] = await Promise.all([
              tx.select({ name: teams.name }).from(teams).where(eq(teams.id, announcement.teamId)),
              tx.select({ name: teams.name }).from(teams).where(eq(teams.id, response.teamId)),
            ]);
            await postSystemMessage(
              tx,
              conversationId,
              matchSystemMessage({
                category: announcement.category,
                gender: announcement.gender,
                format: announcement.format,
                date: created.date,
                time: created.time,
                location: created.location,
                homeTeamName: homeTeam[0].name,
                awayTeamName: awayTeam[0].name,
              }),
              created.id,
            );
            // Celui qui accepte a déjà tout lu : c'est lui qui vient d'écrire
            // l'histoire. Seul l'autre doit voir la pastille s'allumer.
            await markRead(tx, conversationId, request.user.id);
          }
        }
        return { created, declinedTeamIds };
      });

      // Prévient l'équipe retenue, et celles dont la proposition VIENT de
      // tomber — celles déclinées à la main l'ont déjà été à ce moment-là.
      const [ownTeam] = await db.select().from(teams).where(eq(teams.id, match.created.homeTeamId));
      notifyResponseDecision({
        responderTeamId: match.created.awayTeamId,
        accepted: true,
        opponentTeamName: ownTeam.name,
        matchId: match.created.id,
      });
      for (const teamId of match.declinedTeamIds) {
        notifyResponseDecision({
          responderTeamId: teamId,
          accepted: false,
          opponentTeamName: ownTeam.name,
          matchId: null,
        });
      }

      reply.code(201);
      return { matchId: match.created.id };
    },
  );

  // Le coach émetteur décline une proposition ; l'annonce reste ouverte.
  app.post(
    "/announcements/:id/responses/:responseId/decline",
    { preHandler: requireRole("coach") },
    async (request) => {
      const { id, responseId } = responseParamsSchema.parse(request.params);
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
