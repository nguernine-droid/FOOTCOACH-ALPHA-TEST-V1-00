import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import {
  toReliability,
  LATE_WITHDRAWAL_DAYS,
  RELIABILITY_WINDOW_DAYS,
  type ReliabilityDto,
  type WithdrawalReason,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { matches } from "../db/schema.js";

/**
 * Fiabilité des équipes : combien de matchs honorés, combien de désistements,
 * et combien de ceux-là sont tombés trop tard pour rebondir.
 *
 * Rien n'est stocké. Le compte se refait à la lecture, sur les colonnes que le
 * désistement écrit déjà (`withdrawn_by_team_id`, `withdrawal_reason`,
 * `cancelled_at`). Un compteur entretenu à la main aurait fini par diverger du
 * seul fait qui compte : ce que la table des matchs raconte.
 *
 * Servie PAR LOT : la carte d'un coach en demande une, une liste de suggestions
 * en demande dix. Une requête par équipe aurait rendu la liste inutilisable.
 */
export async function reliabilityOf(teamIds: string[]): Promise<Map<string, ReliabilityDto>> {
  const result = new Map<string, ReliabilityDto>();
  if (teamIds.length === 0) return result;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - RELIABILITY_WINDOW_DAYS);
  const sinceIso = since.toISOString().slice(0, 10);

  // Matchs honorés — comptés pour les DEUX équipes, chacune a tenu son
  // engagement. Un match à venir ne compte pas : il n'est pas encore honoré.
  const played = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      count: sql<number>`count(*)::int`,
    })
    .from(matches)
    .where(
      and(
        eq(matches.status, "finished"),
        gte(matches.date, sinceIso),
        or(inArray(matches.homeTeamId, teamIds), inArray(matches.awayTeamId, teamIds)),
      ),
    )
    .groupBy(matches.homeTeamId, matches.awayTeamId);

  // Désistements — imputés à la seule équipe qui a renoncé. L'adversaire subit,
  // il ne doit rien porter au compteur.
  const withdrawn = await db
    .select({
      teamId: matches.withdrawnByTeamId,
      reason: matches.withdrawalReason,
      date: matches.date,
      cancelledAt: matches.cancelledAt,
    })
    .from(matches)
    .where(
      and(
        eq(matches.status, "cancelled"),
        gte(matches.date, sinceIso),
        inArray(matches.withdrawnByTeamId, teamIds),
      ),
    );

  const playedByTeam = new Map<string, number>();
  for (const row of played) {
    for (const id of [row.homeTeamId, row.awayTeamId]) {
      if (!teamIds.includes(id)) continue;
      playedByTeam.set(id, (playedByTeam.get(id) ?? 0) + row.count);
    }
  }

  const withdrawnByTeam = new Map<string, { total: number; late: number; byReason: Partial<Record<WithdrawalReason, number>> }>();
  for (const row of withdrawn) {
    if (!row.teamId) continue;
    const entry = withdrawnByTeam.get(row.teamId) ?? { total: 0, late: 0, byReason: {} };
    entry.total++;
    if (isLate(row.date, row.cancelledAt)) entry.late++;
    if (row.reason) entry.byReason[row.reason] = (entry.byReason[row.reason] ?? 0) + 1;
    withdrawnByTeam.set(row.teamId, entry);
  }

  for (const id of teamIds) {
    const w = withdrawnByTeam.get(id);
    result.set(
      id,
      toReliability({
        played: playedByTeam.get(id) ?? 0,
        withdrawn: w?.total ?? 0,
        lateWithdrawn: w?.late ?? 0,
        withdrawnByReason: w?.byReason ?? {},
      }),
    );
  }
  return result;
}

/**
 * Le désistement est-il tardif ?
 *
 * `cancelled_at` est absent des annulations les plus anciennes, écrites avant
 * que la colonne existe. On ne devine pas : sans horodatage, le désistement
 * n'est pas compté comme tardif. Mieux vaut sous-estimer le reproche que
 * l'inventer.
 */
function isLate(matchDate: string, cancelledAt: Date | null): boolean {
  if (!cancelledAt) return false;
  const kickoff = Date.parse(`${matchDate}T00:00:00Z`);
  if (Number.isNaN(kickoff)) return false;
  const days = (kickoff - cancelledAt.getTime()) / 86_400_000;
  return days < LATE_WITHDRAWAL_DAYS;
}

/** Raccourci pour une équipe seule */
export async function reliabilityOfTeam(teamId: string): Promise<ReliabilityDto> {
  const map = await reliabilityOf([teamId]);
  return map.get(teamId)!;
}
