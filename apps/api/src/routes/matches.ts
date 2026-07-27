import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq, or } from "drizzle-orm";
import {
  confirmScoreSchema,
  finalScoreSchema,
  type MatchDetailDto,
  type MatchDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { matches, teams } from "../db/schema.js";
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

  app.get("/matches/:id", async (request): Promise<MatchDetailDto> => {
    const { id } = request.params as { id: string };
    const row = await getMatchOr404(id);
    return toDto(row, request.user.teamId);
  });

  // Coup d'envoi : l'un ou l'autre coach passe le match en direct
  app.post("/matches/:id/kickoff", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = request.params as { id: string };
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);
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
    const { id } = request.params as { id: string };
    const input = finalScoreSchema.parse(request.body);
    const { match } = await getMatchOr404(id);
    assertCoachOfMatch(match, request.user.teamId);
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
    return { token };
  });

  /**
   * Validation par le coach adverse. Deux garde-fous cumulés : il doit être le
   * coach de l'AUTRE équipe, et présenter le jeton du QR — qu'il ne peut obtenir
   * qu'en scannant l'écran de son homologue.
   */
  app.post("/matches/:id/confirm-score", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = request.params as { id: string };
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
    if (input.token !== match.confirmationToken) {
      throw new HttpError(400, "QR code invalide ou périmé — demandez au coach de réafficher le sien");
    }

    await db
      .update(matches)
      .set({ status: "finished", scoreConfirmedAt: new Date(), confirmationToken: null })
      .where(eq(matches.id, id));
    return { ok: true };
  });
}
