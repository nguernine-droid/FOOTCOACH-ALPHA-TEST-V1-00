import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { levelForPoints, POINTS_COOLDOWN_DAYS, type CoachLevelDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { coachPoints, matches } from "../db/schema.js";

/**
 * Total des points d'un coach. Somme du journal plutôt que compteur entretenu :
 * il ne peut pas dériver de son détail, et le coût reste celui d'un index sur
 * `coach_id` pour quelques dizaines de lignes par coach.
 */
export async function totalPointsOf(coachId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${coachPoints.points}), 0)::int` })
    .from(coachPoints)
    .where(eq(coachPoints.coachId, coachId));
  return row?.total ?? 0;
}

/** Totaux de plusieurs coachs en une requête — les fiches de relations en listent N */
export async function totalPointsOfMany(coachIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (coachIds.length === 0) return totals;
  const rows = await db
    .select({
      coachId: coachPoints.coachId,
      total: sql<number>`coalesce(sum(${coachPoints.points}), 0)::int`,
    })
    .from(coachPoints)
    .where(inArray(coachPoints.coachId, coachIds))
    .groupBy(coachPoints.coachId);
  for (const row of rows) totals.set(row.coachId, row.total);
  return totals;
}

export async function levelOf(coachId: string): Promise<CoachLevelDto> {
  return levelForPoints(await totalPointsOf(coachId));
}

/**
 * Ces deux équipes se sont-elles déjà rencontrées CONTRE POINTS dans les
 * trente derniers jours ?
 *
 * Le plafond porte sur la paire d'équipes, sans considérer qui recevait : deux
 * coachs qui alternent domicile et extérieur forment la même paire, et c'est
 * précisément la boucle qu'on veut fermer. D'où la comparaison dans les deux
 * sens plutôt que sur (home, away).
 *
 * Ne comptent que les matchs ayant réellement rapporté : un match plafonné
 * n'écrit aucune ligne, il ne peut donc pas prolonger le plafond de lui-même.
 */
export async function pairOnCooldown(teamA: string, teamB: string): Promise<boolean> {
  const since = new Date(Date.now() - POINTS_COOLDOWN_DAYS * 86400000);
  const [row] = await db
    .select({ id: coachPoints.id })
    .from(coachPoints)
    .innerJoin(matches, eq(coachPoints.matchId, matches.id))
    .where(
      and(
        gt(coachPoints.createdAt, since),
        or(
          and(eq(matches.homeTeamId, teamA), eq(matches.awayTeamId, teamB)),
          and(eq(matches.homeTeamId, teamB), eq(matches.awayTeamId, teamA)),
        ),
      ),
    )
    .limit(1);
  return row != null;
}
