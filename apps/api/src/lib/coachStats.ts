import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { matches, teamCoaches } from "../db/schema.js";

/**
 * Matchs joués par les équipes qu'un coach encadre.
 *
 * Comptés au niveau de l'ÉQUIPE et non de la personne : c'est le compteur
 * d'expérience de la carte coach, et un adjoint arrivé en cours de saison ne
 * doit pas afficher zéro alors qu'il accompagne l'équipe depuis des mois. Les
 * points, eux, restent personnels — les deux chiffres ne disent pas la même
 * chose et n'ont pas à concorder.
 *
 * Seuls les matchs `finished` comptent : un match à venir n'est pas une
 * expérience, un match annulé encore moins.
 *
 * `count(distinct)` parce qu'un coach peut encadrer plusieurs équipes ; deux
 * des siennes ne peuvent pas s'affronter (voir teamsSharingCoachWith), mais le
 * compte ne doit pas en dépendre.
 */
export async function matchesPlayedBy(coachId: string): Promise<number> {
  const teamIds = await db
    .select({ teamId: teamCoaches.teamId })
    .from(teamCoaches)
    .where(eq(teamCoaches.coachId, coachId));
  if (teamIds.length === 0) return 0;

  const ids = teamIds.map((t) => t.teamId);
  const [row] = await db
    .select({ value: sql<number>`count(distinct ${matches.id})::int` })
    .from(matches)
    .where(
      and(
        eq(matches.status, "finished"),
        or(inArray(matches.homeTeamId, ids), inArray(matches.awayTeamId, ids)),
      ),
    );
  return row?.value ?? 0;
}
