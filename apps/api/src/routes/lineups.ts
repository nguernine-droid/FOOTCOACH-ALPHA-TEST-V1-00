import type { FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { saveLineupSchema, type LineupDto, type LineupPlayerDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { lineups, matches, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

// La compo adverse est visible N heures avant le match (2h par défaut, configurable)
const REVEAL_BEFORE_MS = Number(process.env.LINEUP_REVEAL_HOURS ?? 2) * 3600 * 1000;

function kickoff(match: typeof matches.$inferSelect): Date {
  return new Date(`${match.date}T${match.time}`);
}

async function getMatchOr404(id: string) {
  const [match] = await db.select().from(matches).where(eq(matches.id, id));
  if (!match) throw new HttpError(404, "Match introuvable");
  return match;
}

async function loadLineup(matchId: string, teamId: string): Promise<LineupPlayerDto[]> {
  const rows = await db
    .select({ lineup: lineups, player: users })
    .from(lineups)
    .innerJoin(users, eq(lineups.playerUserId, users.id))
    .where(and(eq(lineups.matchId, matchId), eq(lineups.teamId, teamId)));
  return rows.map(({ lineup, player }) => ({
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    jerseyNumber: player.jerseyNumber,
    x: lineup.posX,
    y: lineup.posY,
  }));
}

export function lineupRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("coach"));

  app.get("/matches/:id/lineup", async (request): Promise<LineupDto> => {
    const { id } = request.params as { id: string };
    const match = await getMatchOr404(id);
    const myTeamId = request.user.teamId;
    if (myTeamId !== match.homeTeamId && myTeamId !== match.awayTeamId) {
      throw new HttpError(403, "Vous n'êtes pas le coach d'une des équipes de ce match");
    }
    const opponentTeamId = myTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    const visibleAt = new Date(kickoff(match).getTime() - REVEAL_BEFORE_MS);
    // Match en cours ou terminé : la compo n'a plus rien de secret
    const opponentLocked = match.status === "scheduled" && new Date() < visibleAt;

    return {
      mine: await loadLineup(id, myTeamId!),
      opponent: opponentLocked ? null : await loadLineup(id, opponentTeamId),
      opponentLocked,
      opponentVisibleAt: visibleAt.toISOString(),
    };
  });

  // Remplace entièrement la compo de SON équipe pour ce match
  app.put("/matches/:id/lineup", async (request) => {
    const { id } = request.params as { id: string };
    const match = await getMatchOr404(id);
    const myTeamId = request.user.teamId;
    if (myTeamId !== match.homeTeamId && myTeamId !== match.awayTeamId) {
      throw new HttpError(403, "Vous n'êtes pas le coach d'une des équipes de ce match");
    }
    const { players } = saveLineupSchema.parse(request.body);

    if (players.length > 0) {
      const ids = players.map((p) => p.playerId);
      if (new Set(ids).size !== ids.length) throw new HttpError(400, "Un joueur ne peut être placé qu'une fois");
      const teamPlayers = await db
        .select()
        .from(users)
        .where(and(inArray(users.id, ids), eq(users.teamId, myTeamId!), eq(users.role, "player")));
      if (teamPlayers.length !== ids.length) {
        throw new HttpError(400, "Tous les joueurs placés doivent appartenir à votre équipe");
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(lineups).where(and(eq(lineups.matchId, id), eq(lineups.teamId, myTeamId!)));
      if (players.length > 0) {
        await tx.insert(lineups).values(
          players.map((p) => ({
            matchId: id,
            teamId: myTeamId!,
            playerUserId: p.playerId,
            posX: p.x,
            posY: p.y,
          })),
        );
      }
    });
    return { ok: true };
  });
}
