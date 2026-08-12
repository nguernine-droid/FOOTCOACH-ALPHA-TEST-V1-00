import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import {
  idParamSchema,
  confirmEncounterSchema,
  finalScoreSchema,
  isPlateauCategory,
  levelForPoints,
  withdrawMatchSchema,
  MATCH_POINTS,
  POINTS_COOLDOWN_DAYS,
  type EncounterResultDto,
  type CoachRefDto,
  type MatchDetailDto,
  type MatchDto,
  type PointReason,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { announcementResponses, coachPoints, matchAnnouncements, matches, teams } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { cityCoords } from "../lib/cities.js";
import { pairOnCooldown, totalPointsOf } from "../lib/points.js";
import { tokensMatch } from "../lib/tokens.js";
import { notifyScoreRecorded, notifySosAnnouncement, notifyWithdrawal } from "../lib/push.js";
import { representativeCoachesOf } from "../lib/coachCard.js";

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

function kickoffPassed(match: typeof matches.$inferSelect): boolean {
  return new Date(`${match.date}T${match.time}`).getTime() <= Date.now();
}

/**
 * Le scan de rencontre n'a de sens qu'à partir du JOUR du match, pas de l'heure
 * du coup d'envoi : les coachs se croisent souvent bien avant, à l'arrivée du
 * car ou au vestiaire. Avant ce jour-là, il n'y a rien à attester.
 *
 * La borne est calculée côté serveur : l'horloge d'un téléphone se règle.
 */
function encounterDayReached(match: typeof matches.$inferSelect): boolean {
  return new Date(`${match.date}T00:00`).getTime() <= Date.now();
}

function toDto(
  { match, home, away }: MatchRow,
  viewerTeamId: string | null,
  coaches?: Map<string, CoachRefDto>,
): MatchDto {
  return {
    id: match.id,
    homeTeam: { id: home.id, name: home.name, city: home.city },
    awayTeam: { id: away.id, name: away.name, city: away.city },
    homeCoach: coaches?.get(home.id) ?? null,
    awayCoach: coaches?.get(away.id) ?? null,
    date: match.date,
    time: match.time.slice(0, 5),
    location: match.location,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    mySide: viewerTeamId === match.homeTeamId ? "home" : viewerTeamId === match.awayTeamId ? "away" : null,
    scoreSubmittedByTeamId: match.scoreSubmittedByTeamId,
    finalScoreDue: kickoffPassed(match) && (match.status === "scheduled" || match.status === "live"),
    encounterConfirmedAt: match.encounterConfirmedAt?.toISOString() ?? null,
    encounterOpen: encounterDayReached(match) && match.status !== "cancelled",
    // Jamais servi dans la liste : le jeton ne sort qu'au coach hôte qui demande
    // explicitement à l'afficher (POST /matches/:id/encounter-qr), et qui est
    // alors enregistré comme celui qui a tenu l'écran.
    encounterToken: null,
    withdrawnByTeamId: match.withdrawnByTeamId,
    withdrawalReason: match.withdrawalReason,
    withdrawalDetails: match.withdrawalDetails,
  };
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

export function matchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/matches", async (request): Promise<MatchDto[]> => {
    const { teamId } = request.user;
    if (!teamId) return [];
    const rows = await baseSelect()
      .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
      .orderBy(desc(matches.date), desc(matches.time));
    // Une seule lecture pour toutes les équipes de la liste : le coach d'en
    // face s'affiche sur chaque carte, et une requête par match aurait suffi à
    // rendre l'écran lent au bout d'une saison.
    const coaches = await representativeCoachesOf(rows.flatMap((r) => [r.home.id, r.away.id]));
    return rows.map((r) => toDto(r, teamId, coaches));
  });

  /**
   * Détail d'un match. La vérification d'appartenance manquait ici, alors que
   * les quatre autres routes de ce fichier la portent : tout compte authentifié
   * pouvait lire n'importe quel match par son identifiant — équipes, lieu,
   * score, et surtout le motif et la précision libre d'un désistement, où un
   * coach écrit parfois « blessure de X ».
   *
   * `assertCoachOfMatch` vérifie l'appartenance à l'une des deux équipes, pas le
   * rôle : la règle vaudra telle quelle pour un supporter le jour où son espace
   * rouvrira, sans rien changer ici.
   */
  app.get("/matches/:id", async (request): Promise<MatchDetailDto> => {
    const { id } = idParamSchema.parse(request.params);
    const row = await getMatchOr404(id);
    assertCoachOfMatch(row.match, request.user.teamId);
    const coaches = await representativeCoachesOf([row.home.id, row.away.id]);
    return toDto(row, request.user.teamId, coaches);
  });

  /**
   * Désistement d'un des deux coachs avant le coup d'envoi.
   *
   * Le match est conservé mais annulé — il garde la trace de qui a renoncé et
   * pourquoi. Ce qu'il advient de l'annonce dépend du coach qui se désiste :
   *
   * - l'équipe INVITÉE renonce : l'hôte garde son terrain et son créneau, son
   *   annonce repart donc en recherche et en SOS (tête du radar, alerte aux
   *   coachs du périmètre). Les propositions du premier tour sont effacées pour
   *   que chacun, y compris les coachs déclinés, puisse reproposer ;
   * - l'équipe HÔTE renonce : il n'y a plus de match à offrir, l'annonce est
   *   annulée et l'invité prévenu.
   */
  app.post("/matches/:id/withdraw", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = withdrawMatchSchema.parse(request.body);
    const myTeamId = request.user.teamId;
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, myTeamId);
    if (match.status === "cancelled") throw new HttpError(400, "Ce match est déjà annulé");
    if (match.status !== "scheduled")
      throw new HttpError(400, "Le match a commencé : il ne peut plus faire l'objet d'un désistement");

    const iAmHome = myTeamId === match.homeTeamId;
    const details = input.details?.length ? input.details : null;

    await db.transaction(async (tx) => {
      await tx
        .update(matches)
        .set({
          status: "cancelled",
          withdrawnByTeamId: myTeamId,
          withdrawalReason: input.reason,
          withdrawalDetails: details,
          cancelledAt: new Date(),
        })
        .where(eq(matches.id, id));

      if (iAmHome) {
        // Le SOS d'un cycle précédent n'a plus d'objet : l'annonce est éteinte,
        // et la relance qui lui restait due avec elle.
        await tx
          .update(matchAnnouncements)
          .set({
            status: "cancelled",
            isSos: false,
            sosReason: null,
            sosDetails: null,
            sosAlertedAt: null,
            sosWidenedAt: null,
          })
          .where(eq(matchAnnouncements.id, match.announcementId));
      } else {
        const [reopened] = await tx
          .update(matchAnnouncements)
          .set({
            status: "open",
            isSos: true,
            sosReason: input.reason,
            sosDetails: details,
            // Départ du compte à rebours : les jokers sont alertés maintenant,
            // les autres coachs le seront faute de réponse. `sosWidenedAt`
            // repart à NULL — un second désistement rouvre un cycle entier.
            sosAlertedAt: new Date(),
            sosWidenedAt: null,
          })
          .where(eq(matchAnnouncements.id, match.announcementId))
          .returning({ category: matchAnnouncements.category });
        // Amical : table rase, l'annonce repart de zéro. Plateau : les AUTRES
        // équipes acceptées restent engagées — seule la place du désisté se
        // libère, c'est elle que le SOS annonce.
        if (reopened && isPlateauCategory(reopened.category)) {
          await tx
            .delete(announcementResponses)
            .where(
              and(
                eq(announcementResponses.announcementId, match.announcementId),
                eq(announcementResponses.teamId, myTeamId!),
              ),
            );
        } else {
          await tx
            .delete(announcementResponses)
            .where(eq(announcementResponses.announcementId, match.announcementId));
        }
      }
    });

    const opponentTeamId = iAmHome ? match.awayTeamId : match.homeTeamId;
    const [myTeam] = await db.select().from(teams).where(eq(teams.id, myTeamId!));
    notifyWithdrawal({
      opponentTeamId,
      withdrawnTeamName: myTeam?.name ?? "L'équipe adverse",
      reason: input.reason,
      reopened: !iAmHome,
    });

    // L'annonce repartie en SOS mérite une alerte immédiate : le match est
    // souvent proche, et c'est le seul moyen de retrouver un adversaire à temps.
    if (!iAmHome) {
      const [announcement] = await db
        .select()
        .from(matchAnnouncements)
        .where(eq(matchAnnouncements.id, match.announcementId));
      const [homeTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId));
      notifySosAnnouncement({
        teamName: homeTeam?.name ?? "Une équipe",
        category: announcement.category,
        format: announcement.format,
        city: announcement.city,
        date: announcement.date,
        venue: cityCoords(announcement.city),
        excludeTeamIds: [match.homeTeamId, match.awayTeamId],
      });
    }

    return { ok: true, announcementReopened: !iAmHome };
  });

  // Coup d'envoi : l'un ou l'autre coach passe le match en direct
  app.post("/matches/:id/kickoff", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);
    if (match.status === "cancelled") throw new HttpError(400, "Ce match a été annulé");
    if (match.status !== "scheduled") throw new HttpError(400, "Le coup d'envoi a déjà été donné");
    await db.update(matches).set({ status: "live" }).where(eq(matches.id, id));
    return { ok: true };
  });

  /**
   * Le QR de rencontre, servi au coach de l'équipe qui REÇOIT — celle dont
   * l'annonce est à l'origine du match. Le sens est fixe, contrairement à
   * l'ancienne validation du score où c'était le premier qui saisissait qui
   * montrait : ici, l'hôte reçoit chez lui, c'est lui qui tient l'écran.
   *
   * Une écriture, donc un POST : l'appel retient QUEL coach a affiché le QR.
   * C'est lui qui touchera les points côté hôte, et non « le coach principal »
   * — l'adjoint qui encadre réellement le déplacement ne doit pas être effacé.
   *
   * Le jeton est créé au premier affichage et ne change plus : le régénérer
   * invaliderait le QR déjà ouvert sur le téléphone d'à côté.
   */
  app.post("/matches/:id/encounter-qr", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);
    if (match.status === "cancelled") throw new HttpError(400, "Ce match a été annulé");
    if (request.user.teamId !== match.homeTeamId) {
      throw new HttpError(403, "C'est l'équipe qui reçoit qui montre le QR code");
    }
    if (match.encounterConfirmedAt) throw new HttpError(400, "La rencontre est déjà validée");
    if (!encounterDayReached(match)) {
      throw new HttpError(400, "Le QR code de rencontre s'ouvre le jour du match");
    }

    const token = match.encounterToken ?? crypto.randomBytes(24).toString("base64url");
    await db
      .update(matches)
      .set({ encounterToken: token, encounterTokenCoachId: request.user.id })
      .where(eq(matches.id, id));
    return { token };
  });

  /**
   * Validation de la rencontre par le coach qui s'est DÉPLACÉ. Deux garde-fous
   * cumulés : il doit être le coach de l'équipe visiteuse, et présenter le
   * jeton du QR — qu'il ne peut obtenir qu'en le scannant sur l'écran d'en
   * face. C'est ce qui rend l'attestation impossible à distance, et donc les
   * points impossibles à réclamer sans s'être déplacé.
   *
   * Les deux coachs gagnent 10 points ; celui qui répond à un SOS en gagne 20.
   * Sauf si ces deux équipes se sont déjà rencontrées contre points dans les
   * trente derniers jours : la rencontre est alors validée sans rien rapporter.
   */
  app.post("/matches/:id/confirm-encounter", { preHandler: requireRole("coach") }, async (request): Promise<EncounterResultDto> => {
    const { id } = idParamSchema.parse(request.params);
    const input = confirmEncounterSchema.parse(request.body);
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);

    if (match.status === "cancelled") throw new HttpError(400, "Ce match a été annulé");
    if (match.encounterConfirmedAt) throw new HttpError(400, "Cette rencontre est déjà validée");
    if (request.user.teamId !== match.awayTeamId) {
      throw new HttpError(403, "C'est le coach qui se déplace qui scanne le QR code");
    }
    if (!match.encounterToken) {
      throw new HttpError(400, "Le coach qui reçoit n'a pas encore affiché son QR code");
    }
    // Comparaison à durée constante. Une comparaison de chaînes s'arrête au
    // premier octet qui diffère : sa durée renseigne sur le nombre d'octets
    // corrects. L'exploitation est ici très théorique — le jeton fait 24 octets
    // aléatoires, l'appelant doit déjà être le coach de l'équipe visiteuse, et
    // le bruit réseau noie l'écart — mais un jeton d'authentification ne se
    // compare pas autrement, et cela ne coûte rien.
    if (!tokensMatch(input.token, match.encounterToken)) {
      throw new HttpError(400, "QR code invalide — demandez au coach de réafficher le sien");
    }

    // Le bonus tient à l'état de l'annonce AU MOMENT où elle a été reprise :
    // `is_sos` retombe une fois l'annonce pourvue, il faut donc le lire avant.
    const [announcement] = await db
      .select({ isSos: matchAnnouncements.isSos })
      .from(matchAnnouncements)
      .where(eq(matchAnnouncements.id, match.announcementId));
    const wasSos = announcement?.isSos ?? false;
    const reason: PointReason = wasSos ? "sos" : "rencontre";

    const onCooldown = await pairOnCooldown(match.homeTeamId, match.awayTeamId);
    const scannerPoints = onCooldown ? 0 : wasSos ? MATCH_POINTS.sosResponder : MATCH_POINTS.rencontre;
    const hostPoints = onCooldown ? 0 : MATCH_POINTS.rencontre;

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(matches)
        .set({ encounterConfirmedAt: new Date(), encounterConfirmedByCoachId: request.user.id })
        .where(and(eq(matches.id, id), isNull(matches.encounterConfirmedAt)))
        .returning({ id: matches.id });
      // Deux scans simultanés : le second ne trouve plus la rencontre ouverte
      // et repart sans créditer quoi que ce soit.
      if (!updated) throw new HttpError(400, "Cette rencontre vient d'être validée");

      if (onCooldown) return;
      const awards = [{ coachId: request.user.id, points: scannerPoints, reason }];
      // Côté hôte, seul le coach qui a tenu l'écran est crédité. S'il manque,
      // c'est que le QR n'a jamais été demandé — auquel cas on n'en est pas là.
      if (match.encounterTokenCoachId && match.encounterTokenCoachId !== request.user.id) {
        awards.push({ coachId: match.encounterTokenCoachId, points: hostPoints, reason: "rencontre" });
      }
      await tx.insert(coachPoints).values(awards.map((a) => ({ ...a, matchId: id })));
    });

    const totalPoints = await totalPointsOf(request.user.id);
    return {
      pointsAwarded: scannerPoints,
      reason,
      cappedByCooldown: onCooldown,
      totalPoints,
      level: levelForPoints(totalPoints),
    };
  });

  /**
   * Saisie du score final par l'un des deux coachs — elle clôt le match.
   *
   * Plus de contre-signature : c'est le scan de rencontre, plus tôt dans la
   * journée, qui atteste que les deux équipes se sont bien retrouvées. Le score
   * reste donc la parole d'un seul coach ; il est corrigeable tant que personne
   * n'a rien à y redire, ce que l'ancienne validation figeait.
   */
  app.post("/matches/:id/final-score", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = finalScoreSchema.parse(request.body);
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);
    if (match.status === "cancelled") throw new HttpError(400, "Ce match a été annulé");
    if (!kickoffPassed(match)) throw new HttpError(400, "Le match n'a pas encore eu lieu");

    await db
      .update(matches)
      .set({
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status: "finished",
        scoreSubmittedByTeamId: request.user.teamId,
        scoreSubmittedAt: new Date(),
      })
      .where(eq(matches.id, id));

    // Le coach adverse n'a plus rien à valider, mais il doit savoir ce qui a
    // été inscrit : c'est la seule chose qui lui permet de le contester.
    const opponentTeamId = match.homeTeamId === request.user.teamId ? match.awayTeamId : match.homeTeamId;
    const [submitter] = await db.select().from(teams).where(eq(teams.id, request.user.teamId!));
    notifyScoreRecorded({
      opponentTeamId,
      submittedByTeamName: submitter?.name ?? "L'équipe adverse",
      score: `${input.homeScore} – ${input.awayScore}`,
      matchId: id,
    });
    return { ok: true };
  });
}
