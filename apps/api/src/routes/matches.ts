import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq, or } from "drizzle-orm";
import {
  idParamSchema,
  confirmScoreSchema,
  finalScoreSchema,
  withdrawMatchSchema,
  type MatchDetailDto,
  type MatchDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { announcementResponses, matchAnnouncements, matches, teams } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { cityCoords } from "../lib/cities.js";
import { tokensMatch } from "../lib/tokens.js";
import { notifyScoreToConfirm, notifySosAnnouncement, notifyWithdrawal } from "../lib/push.js";

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

function toDto({ match, home, away }: MatchRow, viewerTeamId: string | null): MatchDto {
  // Le jeton du QR n'est rendu qu'au coach qui a saisi le score : c'est lui qui
  // l'affiche, l'autre l'obtient en scannant.
  const isSubmitter = viewerTeamId != null && viewerTeamId === match.scoreSubmittedByTeamId;
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
    scoreSubmittedByTeamId: match.scoreSubmittedByTeamId,
    scoreConfirmedAt: match.scoreConfirmedAt?.toISOString() ?? null,
    confirmationToken: isSubmitter ? match.confirmationToken : null,
    finalScoreDue: kickoffPassed(match) && (match.status === "scheduled" || match.status === "live"),
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
    return rows.map((r) => toDto(r, teamId));
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
    return toDto(row, request.user.teamId);
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
   *
   * Le délai FFF de 10 jours n'est pas réévalué : la déclaration au district
   * porte sur la tenue du match, pas sur l'identité de l'adversaire.
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
        // Le SOS d'un cycle précédent n'a plus d'objet : l'annonce est éteinte.
        await tx
          .update(matchAnnouncements)
          .set({ status: "cancelled", isSos: false, sosReason: null, sosDetails: null })
          .where(eq(matchAnnouncements.id, match.announcementId));
      } else {
        await tx
          .update(matchAnnouncements)
          .set({ status: "open", isSos: true, sosReason: input.reason, sosDetails: details })
          .where(eq(matchAnnouncements.id, match.announcementId));
        await tx
          .delete(announcementResponses)
          .where(eq(announcementResponses.announcementId, match.announcementId));
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
   * Saisie du score final par l'un des deux coachs. Le match passe en attente de
   * validation et un jeton est émis : c'est le contenu du QR code que le coach
   * adverse devra scanner. Une nouvelle saisie régénère le jeton, ce qui
   * invalide le QR précédemment affiché.
   */
  app.post("/matches/:id/final-score", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = finalScoreSchema.parse(request.body);
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);
    if (match.status === "cancelled") throw new HttpError(400, "Ce match a été annulé");
    if (match.status === "finished") throw new HttpError(400, "Le score de ce match a déjà été validé");
    if (!kickoffPassed(match)) throw new HttpError(400, "Le match n'a pas encore eu lieu");

    const token = crypto.randomBytes(24).toString("base64url");
    await db
      .update(matches)
      .set({
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status: "awaiting_confirmation",
        scoreSubmittedByTeamId: request.user.teamId,
        scoreSubmittedAt: new Date(),
        confirmationToken: token,
      })
      .where(eq(matches.id, id));

    // Le coach adverse doit scanner ce QR : on le prévient tout de suite
    const opponentTeamId = match.homeTeamId === request.user.teamId ? match.awayTeamId : match.homeTeamId;
    const [submitter] = await db.select().from(teams).where(eq(teams.id, request.user.teamId!));
    notifyScoreToConfirm({
      opponentTeamId,
      submittedByTeamName: submitter?.name ?? "L'équipe adverse",
      matchId: id,
    });
    return { token };
  });

  /**
   * Validation par le coach adverse. Deux garde-fous cumulés : il doit être le
   * coach de l'AUTRE équipe, et présenter le jeton du QR — qu'il ne peut obtenir
   * qu'en scannant l'écran de son homologue.
   */
  app.post("/matches/:id/confirm-score", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = confirmScoreSchema.parse(request.body);
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);

    if (match.status === "finished") throw new HttpError(400, "Le score de ce match a déjà été validé");
    if (match.status !== "awaiting_confirmation" || !match.confirmationToken) {
      throw new HttpError(400, "Aucun score en attente de validation sur ce match");
    }
    if (request.user.teamId === match.scoreSubmittedByTeamId) {
      throw new HttpError(403, "Le score doit être validé par le coach adverse");
    }
    // Comparaison à durée constante. Une comparaison de chaînes s'arrête au
    // premier octet qui diffère : sa durée renseigne sur le nombre d'octets
    // corrects. L'exploitation est ici très théorique — le jeton fait 24 octets
    // aléatoires, l'appelant doit déjà être le coach de l'équipe adverse, et le
    // bruit réseau noie l'écart — mais un jeton d'authentification ne se compare
    // pas autrement, et cela ne coûte rien.
    if (!tokensMatch(input.token, match.confirmationToken)) {
      throw new HttpError(400, "QR code invalide ou périmé — demandez au coach de réafficher le sien");
    }

    await db
      .update(matches)
      .set({ status: "finished", scoreConfirmedAt: new Date(), confirmationToken: null })
      .where(eq(matches.id, id));
    return { ok: true };
  });
}
