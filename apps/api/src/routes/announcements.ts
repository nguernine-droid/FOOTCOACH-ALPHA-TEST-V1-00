import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, inArray, ne, notInArray, sql } from "drizzle-orm";
import {
  idParamSchema,
  responseParamsSchema,
  announcementCategoryOf,
  announcementCategoryLabel,
  fineCategoriesOf,
  asDivisionLevel,
  asMatchCategory,
  asMatchGender,
  categoryLabel,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  isPlateauCategory,
  PLATEAU_TEAMS_WANTED,
  MATCH_GENDER_LABELS,
  type AnnouncementDefaultsDto,
  type AnnouncementDto,
  type AnnouncementSuggestionsDto,
  type AnnouncementResponseDto,
  type CategoryStatsDto,
  type CoachRefDto,
  type MatchGender,
  type RadarDto,
  type ResponseStatus,
  toReliability,
  NO_HISTORY,
  type ReliabilityDto,
  type TeamDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import {
  announcementResponses,
  conversations,
  matchAnnouncements,
  matches,
  teamCoaches,
  teams,
  tournaments,
  users,
} from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { bearingDeg, cityCoords, haversineKm } from "../lib/cities.js";
import { loadOrigin } from "../lib/coachOrigin.js";
import {
  coachIdsOfTeams,
  notifyAnnouncementPublished,
  notifyAnnouncementResponse,
  notifyMatchAgreed,
  notifyResponseDecision,
  notifyResponseWithdrawn,
  notifySameDayRivals,
  notifyValidationAwaited,
} from "../lib/push.js";
import { sameDayRivalCounts, sameDayRivalsOf, withinRadius } from "../lib/sameDayRivals.js";
import { tournamentsInRadar } from "./tournaments.js";
import { representativeCoachOf, representativeCoachesOf } from "../lib/coachCard.js";
import { avatarUrlOf, toTeamDto } from "./auth.js";
import { markRead, openConversation, postSystemMessage } from "../lib/conversations.js";
import { teamsSharingCoachWith } from "../lib/teamScope.js";
import { venueById } from "../lib/venueLookup.js";
import { reliabilityOf } from "../lib/reliability.js";
import { suggestionsFor } from "../lib/announcementSuggestions.js";

/**
 * Ce que l'appelant a déjà chargé pour cette annonce. Un objet plutôt qu'une
 * file d'arguments : ils sont presque tous facultatifs, et les `undefined`
 * alignés pour atteindre le neuvième ne disaient plus lequel était lequel.
 */
interface DtoExtras {
  link?: { matchId: string; opponentTeam: TeamDto };
  myCoords?: { lat: number; lng: number } | null;
  responses?: AnnouncementResponseDto[];
  /** Ma proposition sur cette annonce : où elle en est, et le fil qu'elle a ouvert */
  myResponse?: { status: ResponseStatus; conversationId: string | null } | null;
  /** Coach représentant l'équipe émettrice, quand l'appelant l'a chargé */
  coach?: CoachRefDto | null;
  /** Acceptées déjà comptées par l'appelant (radar) — sinon relues des propositions */
  acceptedCount?: number;
  /**
   * Fiabilité de l'équipe émettrice, chargée PAR LOT par l'appelant. Sans elle,
   * une annonce fraîchement publiée n'a pas encore d'historique à montrer — ce
   * qui est exact : `NO_HISTORY` dit « aucun match à son actif », et c'est bien
   * ce qu'on sait d'une équipe dont on n'a rien demandé.
   */
  reliability?: ReliabilityDto;
  /** Équipes qui cherchent un match le même jour dans la même catégorie (mes annonces) */
  sameDayRivals?: number;
}

function toDto(
  row: { announcement: typeof matchAnnouncements.$inferSelect; team: typeof teams.$inferSelect },
  myTeamId: string | null,
  extras: DtoExtras = {},
): AnnouncementDto {
  const { link, myCoords, responses, myResponse, coach, acceptedCount, reliability } = extras;
  const { announcement, team } = row;
  const plateau = isPlateauCategory(announcement.category);
  const teamsAccepted = acceptedCount ?? (responses ?? []).filter((r) => r.status === "accepted").length;
  // Position relative du LIEU DU MATCH, pas du siège du club : une annonce
  // peut se jouer loin de la ville de l'équipe qui la publie, et c'est le
  // déplacement réel qui intéresse le coach. `null` si la ville du match est
  // absente de l'annuaire — mieux vaut ne rien annoncer qu'une fausse distance.
  // Le terrain retenu situe le match au mètre près ; la commune n'est qu'un
  // repli, et c'est ce repli qui plaçait jusqu'ici tous les clubs d'une même
  // ville au même point.
  const exact =
    announcement.venueLat != null && announcement.venueLng != null
      ? { lat: announcement.venueLat, lng: announcement.venueLng }
      : null;
  const venueCoords = team.id !== myTeamId ? (exact ?? cityCoords(announcement.city)) : null;
  const distanceKm = myCoords && venueCoords ? haversineKm(myCoords, venueCoords) : null;
  const bearing = myCoords && venueCoords ? bearingDeg(myCoords, venueCoords) : null;
  return {
    id: announcement.id,
    team: toTeamDto(team),
    date: announcement.date,
    time: announcement.time.slice(0, 5),
    city: announcement.city,
    stadium: announcement.stadium,
    category: announcement.category,
    preciseCategory: asMatchCategory(announcement.preciseCategory),
    gender: announcement.gender,
    level: asDivisionLevel(announcement.level),
    format: announcement.format,
    comment: announcement.comment,
    status: announcement.status,
    isMine: team.id === myTeamId,
    viewCount: announcement.viewCount,
    plateau,
    teamsWanted: plateau ? PLATEAU_TEAMS_WANTED : 1,
    teamsAccepted,
    // Plateau clos sans avoir fait le plein : il se joue à deux ou trois
    // équipes. Déduit et non stocké — c'est exactement « pourvu, mais pas
    // complet », et une colonne de plus pourrait mentir sur ce couple-là.
    plateauReduced: plateau && announcement.status === "matched" && teamsAccepted < PLATEAU_TEAMS_WANTED,
    coach: coach ?? null,
    createdAt: announcement.createdAt.toISOString(),
    matchId: link?.matchId ?? null,
    opponentTeam: link?.opponentTeam ?? null,
    venueId: announcement.venueId,
    reliability: reliability ?? toReliability(NO_HISTORY),
    distanceKm,
    bearingDeg: bearing,
    responses: responses ?? [],
    myResponseStatus: myResponse?.status ?? null,
    myResponseConversationId: myResponse?.conversationId ?? null,
    sameDayRivals: extras.sameDayRivals ?? 0,
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
      opponentTeam: toTeamDto(opponent),
    });
  }
  return links;
}

/** Propositions (avec équipe et coach répondant) indexées par annonce */
async function loadResponses(announcementIds: string[]) {
  const byAnnouncement = new Map<string, (AnnouncementResponseDto & { teamId: string })[]>();
  if (announcementIds.length === 0) return byAnnouncement;
  const rows = await db
    .select({ response: announcementResponses, team: teams, responder: users })
    .from(announcementResponses)
    .innerJoin(teams, eq(announcementResponses.teamId, teams.id))
    // Jointure externe : `coachId` est nullable (propositions d'avant que la
    // colonne existe), et le compte a pu être supprimé depuis.
    .leftJoin(users, eq(announcementResponses.coachId, users.id))
    .where(inArray(announcementResponses.announcementId, announcementIds))
    .orderBy(desc(announcementResponses.createdAt));
  // À défaut du coach qui a cliqué, le représentant de l'équipe — chargés en
  // une fois pour toutes les propositions orphelines.
  const fallbacks = await representativeCoachesOf(
    [...new Set(rows.filter((r) => !r.responder).map((r) => r.team.id))],
  );
  for (const { response, team, responder } of rows) {
    const list = byAnnouncement.get(response.announcementId) ?? [];
    list.push({
      id: response.id,
      team: toTeamDto(team),
      // Références de l'équipe qui propose, portées jusqu'à l'émetteur : c'est
      // lui qui doit voir, avant d'accepter, que des U15 féminines répondent à
      // son annonce U12-U13 masculine.
      teamCategory: asMatchCategory(team.category),
      teamGender: asMatchGender(team.gender),
      coach: responder
        ? { id: responder.id, nickname: responder.nickname, avatarUrl: avatarUrlOf(responder.avatarPath) }
        : (fallbacks.get(team.id) ?? null),
      status: response.status,
      createdAt: response.createdAt.toISOString(),
      conversationId: response.conversationId,
      ownerConfirmed: response.ownerConfirmedAt !== null,
      responderConfirmed: response.responderConfirmedAt !== null,
      teamId: team.id,
    });
    byAnnouncement.set(response.announcementId, list);
  }
  return byAnnouncement;
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
  preciseCategory: string | null;
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
  const category = `${announcementCategoryLabel(input)}${
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

/**
 * L'autre membre d'un fil. C'est lui qu'on attend quand une seule des deux
 * validations est arrivée — le déduire du fil plutôt que de l'équipe évite de
 * notifier un banc entier pour une signature qui n'appartient qu'à une
 * personne.
 */
async function otherMemberOf(conversationId: string | null, me: string): Promise<string | null> {
  if (!conversationId) return null;
  const [row] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!row) return null;
  return row.coachAId === me ? row.coachBId : row.coachAId;
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
    const reliabilities = await reliabilityOf([...new Set(rows.map((r) => r.team.id))]);
    // Qui cherche un adversaire les mêmes jours que moi : un confrère à appeler
    // vaut mieux qu'une annonce de plus en attente de réponse.
    const rivals = await sameDayRivalCounts(
      rows.map((r) => r.announcement),
      await teamsSharingCoachWith(myTeamId),
      await loadOrigin(request.user.id, myTeamId),
      (await db.select({ radiusKm: users.radarRadiusKm }).from(users).where(eq(users.id, request.user.id)))[0]
        ?.radiusKm ?? null,
    );
    return rows.map((r) => {
      const responses = (responsesByAnn.get(r.announcement.id) ?? []).map(({ teamId: _teamId, ...dto }) => dto);
      return toDto(r, myTeamId, {
        link: links.get(r.announcement.id),
        myCoords: null,
        responses,
        coach: coaches.get(r.team.id),
        reliability: reliabilities.get(r.team.id),
        sameDayRivals: rivals.get(r.announcement.id) ?? 0,
      });
    });
  });

  /**
   * Ce que la dernière annonce du coach lègue à la suivante. Le formulaire de
   * publication s'en sert pour se replier sur l'essentiel : un coach republie
   * presque toujours la même catégorie, le même genre, le même format.
   *
   * Sur l'ÉQUIPE ACTIVE, et non sur le coach : celui qui encadre des U13 et des
   * U15 n'hérite pas des U15 en publiant pour les U13. Sans équipe active, ou
   * sans annonce passée, `null` — le formulaire montre alors tout.
   *
   * Déclarée avant `/announcements/:id` par confort de lecture ; Fastify fait
   * de toute façon primer les routes statiques sur les paramétrées.
   */
  app.get(
    "/announcements/last",
    { preHandler: requireRole("coach") },
    async (request): Promise<AnnouncementDefaultsDto | null> => {
      const myTeamId = request.user.teamId;
      if (!myTeamId) return null;
      const [last] = await db
        .select()
        .from(matchAnnouncements)
        .where(eq(matchAnnouncements.teamId, myTeamId))
        .orderBy(desc(matchAnnouncements.createdAt))
        .limit(1);
      if (!last) return null;
      // La catégorie repart en GROUPE d'âges : les annonces d'avant le
      // regroupement portent encore une catégorie fine, que le formulaire ne
      // sait pas sélectionner. Une valeur hors liste vaut « rien à léguer ».
      const category = announcementCategoryOf(last.category);
      if (!category) return null;
      return {
        category,
        // L'âge précisé ne se lègue que s'il appartient encore au groupe repris
        // — sinon il désignerait une année que la catégorie ne contient pas.
        preciseCategory: fineCategoriesOf(category).includes(asMatchCategory(last.preciseCategory)!)
          ? asMatchCategory(last.preciseCategory)
          : null,
        gender: last.gender,
        level: asDivisionLevel(last.level),
        format: last.format,
        stadium: last.stadium,
        city: last.city,
        // Le terrain suit le lieu : republier au même endroit doit reprendre
        // ses coordonnées, pas seulement son nom.
        venueId: last.venueId,
      };
    },
  );

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
    // Un vu de plus, mais pas le mien : ce chiffre dit à l'émetteur combien
    // d'AUTRES coachs se sont penchés sur son annonce, pas combien de fois il
    // l'a relue lui-même.
    if (!isMine) {
      await db
        .update(matchAnnouncements)
        .set({ viewCount: sql`${matchAnnouncements.viewCount} + 1` })
        .where(eq(matchAnnouncements.id, id));
      row.announcement.viewCount += 1;
    }
    const links = await loadMatchLinks([id]);
    const all = (await loadResponses([id])).get(id) ?? [];
    const responses = isMine ? all.map(({ teamId: _teamId, ...dto }) => dto) : [];
    const mine = myTeamId ? (all.find((r) => r.teamId === myTeamId) ?? null) : null;
    // Compté à part : un visiteur ne reçoit pas les propositions, mais les
    // places restantes d'un plateau le concernent au premier chef.
    const acceptedCount = all.filter((r) => r.status === "accepted").length;
    const myCoords = await loadOrigin(request.user.id, myTeamId);
    const coaches = await representativeCoachesOf([row.team.id]);
    return toDto(row, myTeamId, {
      link: links.get(id),
      myCoords,
      responses,
      myResponse: mine && { status: mine.status, conversationId: mine.conversationId },
      coach: coaches.get(row.team.id),
      acceptedCount,
      reliability: (await reliabilityOf([row.team.id])).get(row.team.id),
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
          .select({
            announcementId: announcementResponses.announcementId,
            status: announcementResponses.status,
            // Le fil ouvert par ma proposition : c'est là que le match se
            // valide, et la carte du radar doit pouvoir y mener directement.
            conversationId: announcementResponses.conversationId,
          })
          .from(announcementResponses)
          .where(eq(announcementResponses.teamId, myTeamId))
      : [];
    const myResponseByAnn = new Map(myResponses.map((r) => [r.announcementId, r]));

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
    const reliabilities = await reliabilityOf([...new Set(rows.map((r) => r.team.id))]);
    const items: AnnouncementDto[] = [];
    let beyondRadius = 0;
    for (const row of rows) {
      const dto = toDto(row, myTeamId, {
        myCoords,
        myResponse: myResponseByAnn.get(row.announcement.id) ?? null,
        coach: coaches.get(row.team.id),
        acceptedCount: acceptedCounts.get(row.announcement.id) ?? 0,
        reliability: reliabilities.get(row.team.id),
      });
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

  /**
   * Le bandeau du tableau de bord : combien d'équipes de mon groupe d'âges
   * jouent dans mon secteur, et combien d'entre elles cherchent un match en ce
   * moment — deux chiffres pour situer sa catégorie avant même d'ouvrir le
   * radar.
   *
   * Même périmètre que le radar (position et rayon du coach), même
   * regroupement par PAIRE d'âges que les annonces (`announcementCategoryOf`) :
   * une équipe U13 compte pour le même total qu'une annonce U12-U13.
   */
  app.get(
    "/announcements/category-stats",
    { preHandler: requireRole("coach") },
    async (request): Promise<CategoryStatsDto> => {
      const myTeamId = request.user.teamId;
      const empty: CategoryStatsDto = {
        category: null,
        teamsInCategory: 0,
        announcementsInCategory: 0,
        tournamentsInCategory: 0,
      };
      if (!myTeamId) return empty;

      const [myTeam] = await db.select().from(teams).where(eq(teams.id, myTeamId));
      const category = myTeam ? announcementCategoryOf(myTeam.category) : null;
      if (!category) return empty;

      const myCoords = await loadOrigin(request.user.id, myTeamId);
      const [me] = await db.select({ radiusKm: users.radarRadiusKm }).from(users).where(eq(users.id, request.user.id));
      const radiusKm = me?.radiusKm ?? null;
      const unplayable = await teamsSharingCoachWith(myTeamId);

      // Ville inconnue = jamais écartée, comme partout ailleurs sur le radar :
      // on ne peut pas affirmer qu'elle est hors périmètre.
      const inPerimeter = (city: string) => {
        if (!myCoords || radiusKm === null) return true;
        const coords = cityCoords(city);
        if (!coords) return true;
        return haversineKm(myCoords, coords) <= radiusKm;
      };

      const allTeams = await db
        .select({ id: teams.id, city: teams.city, category: teams.category })
        .from(teams)
        .where(notInArray(teams.id, unplayable));
      const teamsInCategory = allTeams.filter(
        (t) => announcementCategoryOf(t.category) === category && inPerimeter(t.city),
      ).length;

      const openAnnouncements = await db
        .select({ city: matchAnnouncements.city, category: matchAnnouncements.category })
        .from(matchAnnouncements)
        .where(
          and(
            eq(matchAnnouncements.status, "open"),
            gte(matchAnnouncements.date, today()),
            notInArray(matchAnnouncements.teamId, unplayable),
          ),
        );
      const announcementsInCategory = openAnnouncements.filter(
        (a) => announcementCategoryOf(a.category) === category && inPerimeter(a.city),
      ).length;

      // Les tournois du secteur ouverts à ma catégorie. Un tournoi en couvre
      // souvent plusieurs (U12 et U13 le même week-end) : il compte dès que
      // l'UNE d'elles tombe dans mon groupe d'âges.
      const openTournaments = await db
        .select({ city: tournaments.city, category: tournaments.category, teamId: tournaments.teamId })
        .from(tournaments)
        .where(and(eq(tournaments.status, "open"), gte(tournaments.date, today())));
      const tournamentsInCategory = openTournaments.filter(
        (t) =>
          !unplayable.includes(t.teamId) &&
          t.category.some((c) => announcementCategoryOf(c) === category) &&
          inPerimeter(t.city),
      ).length;

      return { category, teamsInCategory, announcementsInCategory, tournamentsInCategory };
    },
  );

  /**
   * ————— Ce qui existe déjà, avant de publier —————
   *
   * Le coach a rempli son annonce et vient de valider. Plutôt que de
   * l'enregistrer et de le laisser attendre qu'on la trouve, on regarde
   * d'abord si le match qu'il cherche n'est pas DÉJÀ publié par quelqu'un
   * d'autre — même tableau, à quelques jours près, dans son secteur.
   *
   * La route ne modifie RIEN. C'est une lecture, intercalée entre le clic et
   * l'enregistrement : le client publie ensuite, qu'il ait retenu une
   * proposition ou non. Elle prend le corps de la création tel quel, et non
   * l'identifiant d'une annonce déjà en base — c'est tout l'intérêt, l'annonce
   * n'existe pas encore et ne doit pas exister pour qu'on puisse aider.
   *
   * Une liste vide est le cas ORDINAIRE tant que la plateforme est peu dense.
   * Le client doit alors publier sans rien afficher : on n'ajoute pas un écran
   * pour annoncer qu'on n'a rien à dire.
   */
  app.post(
    "/announcements/suggestions",
    { preHandler: requireRole("coach") },
    async (request): Promise<AnnouncementSuggestionsDto> => {
      const myTeamId = request.user.teamId;
      if (!myTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
      // Le même schéma que la création : ce qu'on compare doit être exactement
      // ce qui sera publié, sinon les propositions porteraient sur autre chose.
      const input = createAnnouncementSchema.parse(request.body);

      const [myTeam] = await db.select().from(teams).where(eq(teams.id, myTeamId));
      const [me] = await db
        .select({ radiusKm: users.radarRadiusKm })
        .from(users)
        .where(eq(users.id, request.user.id));
      const myCoords = await loadOrigin(request.user.id, myTeamId);

      const { items: scored, totalFound } = await suggestionsFor({
        draft: {
          date: input.date,
          category: input.category,
          gender: input.gender,
          // Le niveau SOUHAITÉ chez l'adversaire d'abord — c'est la demande du
          // coach. À défaut, celui de son équipe : deux équipes de même force
          // font un match équilibré, qu'elles l'aient demandé ou non.
          level: input.level ?? asDivisionLevel(myTeam?.level),
        },
        excludeTeamIds: await teamsSharingCoachWith(myTeamId),
        myTeamId,
        origin: myCoords,
        radiusKm: me?.radiusKm ?? null,
      });

      if (scored.length === 0) return { items: [], totalFound };

      // Chargés pour les cinq retenues seulement, jamais pour l'ensemble des
      // candidates : c'est ce qui garde l'écran intermédiaire instantané.
      const teamIds = [...new Set(scored.map((c) => c.team.id))];
      const [coaches, reliabilities, acceptedRows] = await Promise.all([
        representativeCoachesOf(teamIds),
        reliabilityOf(teamIds),
        db
          .select({ announcementId: announcementResponses.announcementId, count: sql<number>`count(*)::int` })
          .from(announcementResponses)
          .where(
            and(
              inArray(announcementResponses.announcementId, scored.map((c) => c.announcement.id)),
              eq(announcementResponses.status, "accepted"),
            ),
          )
          .groupBy(announcementResponses.announcementId),
      ]);
      const acceptedCounts = new Map(acceptedRows.map((r) => [r.announcementId, r.count]));

      return {
        items: scored.map((c) => ({
          announcement: toDto(
            { announcement: c.announcement, team: c.team },
            myTeamId,
            {
              myCoords,
              coach: coaches.get(c.team.id),
              acceptedCount: acceptedCounts.get(c.announcement.id) ?? 0,
              reliability: reliabilities.get(c.team.id),
            },
          ),
          score: c.score,
          breakdown: c.breakdown,
        })),
        totalFound,
      };
    },
  );

  app.post("/announcements", { preHandler: requireRole("coach") }, async (request, reply) => {
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const input = createAnnouncementSchema.parse(request.body);
    // Le terrain fait foi sur le nom et la commune : accepter ceux du client à
    // côté d'un identifiant publierait un lieu que personne ne pourrait situer.
    const venue = await venueById(input.venueId);
    const [created] = await db
      .insert(matchAnnouncements)
      .values({
        teamId: request.user.teamId,
        date: input.date,
        time: input.time,
        city: venue?.city ?? input.city,
        stadium: venue?.name ?? input.stadium,
        venueId: venue ? input.venueId : null,
        venueLat: venue?.lat ?? null,
        venueLng: venue?.lng ?? null,
        category: input.category,
        preciseCategory: input.preciseCategory ?? null,
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

    /**
     * ————— La mise en relation —————
     * Les équipes qui cherchaient déjà un adversaire ce jour-là, dans la même
     * catégorie. Elles sont, avec celle qui vient de publier, un match qui
     * s'ignore : chacune attendait qu'on lui réponde. On le leur dit des deux
     * côtés — à elles l'annonce qui vient de paraître, à l'émetteur la liste de
     * ceux qu'il peut appeler tout de suite.
     *
     * Le périmètre est celui de l'émetteur : au-delà de son radar, ces annonces
     * ne lui seraient d'aucune utilité (les destinataires, eux, sont filtrés par
     * LEUR propre rayon dans la notification).
     */
    const rivals = withinRadius(
      await sameDayRivalsOf(created, await teamsSharingCoachWith(request.user.teamId)),
      await loadOrigin(request.user.id, request.user.teamId),
      (await db.select({ radiusKm: users.radarRadiusKm }).from(users).where(eq(users.id, request.user.id)))[0]
        ?.radiusKm ?? null,
    );

    // Le genre suit la catégorie : un coach d'équipe féminine doit voir en un
    // coup d'œil si l'annonce le concerne.
    const label = `${announcementCategoryLabel(created)}${
      created.gender ? ` ${MATCH_GENDER_LABELS[created.gender]}` : ""
    }`;

    // Alerte les coachs dont le périmètre couvre le lieu du match (sans attendre)
    notifyAnnouncementPublished({
      authorUserId: request.user.id,
      announcementId: created.id,
      teamName: team.name,
      category: label,
      format: created.format,
      city: created.city,
      date: created.date,
      venue: cityCoords(created.city),
      sameDayCoachIds: [...(await coachIdsOfTeams([...new Set(rivals.map((r) => r.teamId))]))],
    });
    notifySameDayRivals({
      authorUserId: request.user.id,
      teams: [...new Set(rivals.map((r) => r.teamName))],
      category: label,
      date: created.date,
    });
    return toDto({ announcement: created, team }, request.user.teamId);
  });

  // Modifier une annonce : réservé à l'émetteur, et seulement tant qu'elle
  // cherche encore un adversaire — une fois matchée, ce sont les deux coachs
  // qui décident ensemble, plus le formulaire d'un seul.
  app.patch("/announcements/:id", { preHandler: requireRole("coach") }, async (request): Promise<AnnouncementDto> => {
    const { id } = idParamSchema.parse(request.params);
    const input = updateAnnouncementSchema.parse(request.body);
    const [announcement] = await db.select().from(matchAnnouncements).where(eq(matchAnnouncements.id, id));
    if (!announcement) throw new HttpError(404, "Annonce introuvable");
    if (announcement.teamId !== request.user.teamId) throw new HttpError(403, "Cette annonce ne vous appartient pas");
    if (announcement.status !== "open") throw new HttpError(400, "Seule une annonce ouverte peut être modifiée");

    // Changer de terrain déplace le match : les coordonnées suivent, et les
    // remettre à NULL quand le coach repasse au texte libre évite de laisser
    // l'annonce pointer un terrain qu'elle ne désigne plus.
    const venue = await venueById(input.venueId);
    const [updated] = await db
      .update(matchAnnouncements)
      .set({
        date: input.date,
        time: input.time,
        city: venue?.city ?? input.city,
        stadium: venue?.name ?? input.stadium,
        venueId: venue ? input.venueId : null,
        venueLat: venue?.lat ?? null,
        venueLng: venue?.lng ?? null,
        category: input.category,
        preciseCategory: input.preciseCategory ?? null,
        gender: input.gender,
        level: input.level,
        format: input.format,
        comment: input.comment ?? null,
      })
      .where(eq(matchAnnouncements.id, id))
      .returning();
    const [team] = await db.select().from(teams).where(eq(teams.id, updated.teamId));
    return toDto({ announcement: updated, team }, request.user.teamId);
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

  /**
   * Proposer de jouer — c'est-à-dire OUVRIR LA DISCUSSION, pas s'engager.
   *
   * La proposition crée un fil entre les deux coachs et rien d'autre : le match
   * n'existera qu'une fois qu'ils y auront validé tous les deux. Celui qui
   * propose garde donc le droit de se retirer s'il découvre, en discutant, que
   * l'annonce ne lui convient pas.
   *
   * L'annonce RESTE ouverte (visible au radar) tant qu'aucune proposition n'a
   * réuni les deux signatures.
   */
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

    // Le fil s'ouvre dès la proposition, pas seulement à l'acceptation : les
    // deux coachs peuvent se poser des questions avant d'être sûrs de jouer,
    // et c'est là — pas dans un popup — que se décide « on joue ou pas ».
    let conversationId: string | null = null;
    const ownerCoach = await representativeCoachOf(announcement.teamId);
    if (ownerCoach) {
      conversationId = await openConversation(db, ownerCoach.id, request.user.id, null);
      if (conversationId) {
        await postSystemMessage(
          db,
          conversationId,
          [
            `${responderTeam.name} propose de jouer l'annonce ${announcementCategoryLabel(announcement)}${
              announcement.gender ? ` ${MATCH_GENDER_LABELS[announcement.gender]}` : ""
            } du ${announcement.date} à ${announcement.time.slice(0, 5)}, ${announcement.city}.`,
            // Dit d'emblée ce qu'on attend d'eux : le message est lu par les
            // DEUX coachs, et aucun des deux n'est engagé tant qu'il n'a pas
            // appuyé lui-même.
            "Discutez-en, puis validez tous les deux pour confirmer.",
          ].join("\n"),
          null,
          created.id,
        );
        await db
          .update(announcementResponses)
          .set({ conversationId })
          .where(eq(announcementResponses.id, created.id));
      }
    }

    notifyAnnouncementResponse({
      ownerTeamId: announcement.teamId,
      responseId: created.id,
      responderTeamName: responderTeam.name,
      city: announcement.city,
      conversationId,
    });

    reply.code(201);
    // Le fil part avec la réponse : c'est là que le coach doit atterrir, pas
    // sur la carte du radar qu'il vient de quitter.
    return { responseId: created.id, conversationId };
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

  /**
   * ————— Valider le match, des deux côtés —————
   *
   * Une proposition n'est pas un engagement : elle ouvre un fil. Le match
   * n'existe qu'une fois que LES DEUX coachs ont dit oui, dans n'importe quel
   * ordre. Celui qui a répondu à l'annonce peut donc se raviser après en avoir
   * discuté — c'est précisément ce qu'il ne pouvait pas faire quand la seule
   * signature demandée était celle de l'émetteur : il se retrouvait engagé sur
   * un match qu'il découvrait ensuite injouable.
   *
   * La route garde son chemin (`/accept`) : c'est toujours « je dis oui ». Ce
   * qui change est qu'elle peut ne rien confirmer du tout — `matchId` vaut
   * alors `null`, et l'autre coach est prévenu qu'on l'attend.
   */
  app.post(
    "/announcements/:id/responses/:responseId/accept",
    { preHandler: requireRole("coach") },
    async (request, reply) => {
      const { id, responseId } = responseParamsSchema.parse(request.params);
      const myTeamId = request.user.teamId;
      if (!myTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");

      const outcome = await db.transaction(async (tx) => {
        const [announcement] = await tx
          .select()
          .from(matchAnnouncements)
          .where(eq(matchAnnouncements.id, id))
          .for("update");
        if (!announcement) throw new HttpError(404, "Annonce introuvable");
        if (announcement.status !== "open") throw new HttpError(400, "Cette annonce n'est plus ouverte");
        if (announcement.date < today())
          throw new HttpError(400, "La date de ce match est passée : l'annonce ne peut plus être confirmée");

        const [response] = await tx
          .select()
          .from(announcementResponses)
          .where(and(eq(announcementResponses.id, responseId), eq(announcementResponses.announcementId, id)));
        if (!response) throw new HttpError(404, "Proposition introuvable");
        if (response.status !== "pending") throw new HttpError(400, "Cette proposition n'est plus en attente");

        // De quel côté du fil je me trouve. Un tiers n'a rien à valider ici :
        // ce n'est ni son annonce, ni sa proposition.
        const side =
          announcement.teamId === myTeamId ? "owner" : response.teamId === myTeamId ? "responder" : null;
        if (!side) throw new HttpError(403, "Cette proposition ne vous concerne pas");

        // Dernier verrou avant que le match n'existe : une proposition reçue
        // avant que les deux équipes ne partagent un encadrant serait acceptable
        // ici alors qu'elle ne l'est plus.
        if ((await teamsSharingCoachWith(announcement.teamId)).includes(response.teamId)) {
          throw new HttpError(400, "Vous encadrez aussi l'équipe d'en face : ce match ne peut pas se jouer");
        }

        // Valider deux fois ne signe pas deux fois : la première date fait foi.
        const now = new Date();
        const ownerConfirmedAt =
          side === "owner" ? (response.ownerConfirmedAt ?? now) : response.ownerConfirmedAt;
        const responderConfirmedAt =
          side === "responder" ? (response.responderConfirmedAt ?? now) : response.responderConfirmedAt;
        await tx
          .update(announcementResponses)
          .set({ ownerConfirmedAt, responderConfirmedAt })
          .where(eq(announcementResponses.id, responseId));

        const [myTeam] = await tx.select().from(teams).where(eq(teams.id, myTeamId));
        const plateau = isPlateauCategory(announcement.category);

        // ————— Une seule des deux signatures : rien n'est encore convenu —————
        if (!ownerConfirmedAt || !responderConfirmedAt) {
          if (response.conversationId) {
            await postSystemMessage(
              tx,
              response.conversationId,
              `${myTeam.name} a validé. ${plateau ? "Le plateau sera confirmé" : "Le match sera confirmé"} dès que l'autre coach aura validé à son tour.`,
              null,
              response.id,
            );
            // Valider, c'est avoir lu : le fil ne doit pas s'allumer en non-lu
            // chez celui qui vient d'y écrire.
            await markRead(tx, response.conversationId, request.user.id);
          }
          return {
            match: null,
            conversationId: response.conversationId,
            validatorTeamName: myTeam.name,
            plateau,
            declinedTeamIds: [] as string[],
          };
        }

        // ————— Les deux signatures : le match naît —————
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
        const teamsWanted = plateau ? PLATEAU_TEAMS_WANTED : 1;
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
         * Le fil des deux coachs reçoit le match convenu. C'est en principe
         * celui que la proposition a ouvert — on le reprend tel quel, avec tout
         * ce qui s'y est dit. Il n'est rouvert que s'il manque : proposition
         * antérieure à cette colonne, ou compte disparu depuis.
         *
         * Deux personnes, pas deux équipes : celui qui a proposé et celui qui a
         * publié, quel que soit celui des deux qui vient de valider en second.
         */
        const responderCoachId = response.coachId ?? (await representativeCoachOf(response.teamId))?.id ?? null;
        const ownerCoachId =
          side === "owner" ? request.user.id : ((await representativeCoachOf(announcement.teamId))?.id ?? null);
        const conversationId =
          response.conversationId ??
          (ownerCoachId && responderCoachId
            ? await openConversation(tx, ownerCoachId, responderCoachId, created.id)
            : null);
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
              preciseCategory: announcement.preciseCategory,
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
          // Celui qui valide en second a déjà tout lu : c'est lui qui vient
          // d'écrire l'histoire. Seul l'autre doit voir la pastille s'allumer.
          await markRead(tx, conversationId, request.user.id);
        }
        return {
          match: created,
          conversationId,
          validatorTeamName: myTeam.name,
          plateau,
          declinedTeamIds,
        };
      });

      // ————— Il manque encore une signature : on va la chercher —————
      if (!outcome.match) {
        const awaited = await otherMemberOf(outcome.conversationId, request.user.id);
        if (awaited) {
          notifyValidationAwaited({
            recipientCoachId: awaited,
            validatorTeamName: outcome.validatorTeamName,
            conversationId: outcome.conversationId,
            plateau: outcome.plateau,
          });
        }
        return { matchId: null };
      }

      // Prévient l'équipe d'en face — celui qui vient de valider en second voit
      // déjà le match à l'écran — et celles dont la proposition VIENT de tomber,
      // celles déclinées à la main l'ayant déjà été à ce moment-là.
      const [homeTeam] = await db.select().from(teams).where(eq(teams.id, outcome.match.homeTeamId));
      const [awayTeam] = await db.select().from(teams).where(eq(teams.id, outcome.match.awayTeamId));
      const iAmHome = outcome.match.homeTeamId === myTeamId;
      notifyMatchAgreed({
        recipientTeamId: iAmHome ? outcome.match.awayTeamId : outcome.match.homeTeamId,
        opponentTeamName: iAmHome ? homeTeam.name : awayTeam.name,
        matchId: outcome.match.id,
        plateau: outcome.plateau,
      });
      for (const teamId of outcome.declinedTeamIds) {
        notifyResponseDecision({
          responderTeamId: teamId,
          accepted: false,
          opponentTeamName: homeTeam.name,
          matchId: null,
        });
      }

      reply.code(201);
      return { matchId: outcome.match.id };
    },
  );

  /**
   * Décliner — des deux côtés, là aussi.
   *
   * L'émetteur refuse la proposition qu'il a reçue ; le répondant se retire
   * après avoir vu, en discutant, que l'annonce ne lui convenait pas. Le
   * résultat est le même — la proposition tombe, l'annonce reste ouverte — mais
   * le fil et la notification ne disent pas la même chose : ce n'est pas la
   * même personne qui renonce.
   */
  app.post(
    "/announcements/:id/responses/:responseId/decline",
    { preHandler: requireRole("coach") },
    async (request) => {
      const { id, responseId } = responseParamsSchema.parse(request.params);
      const myTeamId = request.user.teamId;
      if (!myTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");

      const [announcement] = await db.select().from(matchAnnouncements).where(eq(matchAnnouncements.id, id));
      if (!announcement) throw new HttpError(404, "Annonce introuvable");

      const [response] = await db
        .select()
        .from(announcementResponses)
        .where(and(eq(announcementResponses.id, responseId), eq(announcementResponses.announcementId, id)));
      if (!response) throw new HttpError(404, "Proposition introuvable");
      if (response.status !== "pending") throw new HttpError(400, "Cette proposition n'est plus en attente");

      const side =
        announcement.teamId === myTeamId ? "owner" : response.teamId === myTeamId ? "responder" : null;
      if (!side) throw new HttpError(403, "Cette proposition ne vous concerne pas");

      await db
        .update(announcementResponses)
        // La validation déjà donnée tombe avec la proposition : elle portait sur
        // ce match-là, et il n'aura pas lieu.
        .set({ status: "declined", ownerConfirmedAt: null, responderConfirmedAt: null })
        .where(eq(announcementResponses.id, responseId));

      const [ownTeam] = await db.select().from(teams).where(eq(teams.id, announcement.teamId));
      const [responderTeam] = await db.select().from(teams).where(eq(teams.id, response.teamId));

      // Le fil garde la trace de la décision, là où elle a été discutée.
      if (response.conversationId) {
        await postSystemMessage(
          db,
          response.conversationId,
          side === "owner"
            ? "Proposition déclinée."
            : `${responderTeam.name} ne jouera finalement pas : la proposition est retirée.`,
          null,
        );
      }

      if (side === "owner") {
        notifyResponseDecision({
          responderTeamId: response.teamId,
          accepted: false,
          opponentTeamName: ownTeam.name,
          matchId: null,
        });
      } else {
        notifyResponseWithdrawn({
          ownerTeamId: announcement.teamId,
          responderTeamName: responderTeam.name,
          conversationId: response.conversationId,
        });
      }
      return { ok: true };
    },
  );
}
