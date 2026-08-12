import { and, asc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { asMatchCategory, asCoachCategories, levelForPoints, type CoachCardDto, type CoachRefDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import {
  announcementResponses,
  coachRelations,
  matchAnnouncements,
  matches,
  publications,
  teamCoaches,
  teams,
  tournamentRegistrations,
  tournaments,
  users,
} from "../db/schema.js";
import { avatarUrlOf } from "../routes/auth.js";
import { matchesPlayedBy } from "./coachStats.js";
import { totalPointsOf } from "./points.js";

/** Équipes encadrées par un coach — la base de presque toutes les règles ici */
async function teamIdsOf(coachId: string): Promise<string[]> {
  const rows = await db
    .select({ teamId: teamCoaches.teamId })
    .from(teamCoaches)
    .where(eq(teamCoaches.coachId, coachId));
  return rows.map((r) => r.teamId);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Tournois qu'une série d'équipes organise OU auxquels elles sont inscrites */
async function tournamentIdsAround(teamIds: string[]): Promise<Set<string>> {
  if (teamIds.length === 0) return new Set();
  const [organized, joined] = await Promise.all([
    db.select({ id: tournaments.id }).from(tournaments).where(inArray(tournaments.teamId, teamIds)),
    db
      .select({ id: tournamentRegistrations.tournamentId })
      .from(tournamentRegistrations)
      .where(inArray(tournamentRegistrations.teamId, teamIds)),
  ]);
  return new Set([...organized, ...joined].map((r) => r.id));
}

/**
 * Un coach peut-il voir la carte d'un autre ?
 *
 * Le nom et la photo d'un coach ne sont pas publics dans l'application : ils ne
 * le deviennent que pour les gens qui ont une raison de les connaître. Cinq
 * raisons, et pas une de plus :
 *
 * 1. c'est lui-même ;
 * 2. ils sont en relation — il a donné son code, c'est un consentement ;
 * 3. ils ont un match ou un tournoi en commun — ils vont se croiser sur un
 *    terrain, s'ignorer n'aurait aucun sens ;
 * 4. il a une annonce ouverte et visible : **publier, c'est se montrer**. Un
 *    coach qui sollicite des adversaires ne peut pas exiger l'anonymat de ceux
 *    qu'il sollicite. La visibilité se referme d'elle-même quand l'annonce est
 *    pourvue ou périmée.
 * 5. il a signé une publication de contributeur : son billet porte déjà son nom
 *    et sa photo devant tous les coachs, et il reste signé tant qu'il reste
 *    affiché — la carte suit ;
 * 6. il a proposé de jouer une de mes annonces : répondre, c'est se présenter.
 *    L'émetteur décide d'accepter ou non en regardant QUI propose — sa carte
 *    doit s'ouvrir avant la décision, pas après.
 */
export async function canSeeCoachCard(viewerId: string, targetId: string): Promise<boolean> {
  if (viewerId === targetId) return true;

  const [relation] = await db
    .select({ id: coachRelations.id })
    .from(coachRelations)
    .where(and(eq(coachRelations.coachId, viewerId), eq(coachRelations.relatedCoachId, targetId)))
    .limit(1);
  if (relation) return true;

  // Avant le raccourci « pas d'équipe » : signer un billet montre son auteur,
  // qu'il encadre une équipe ou non.
  const [publication] = await db
    .select({ id: publications.id })
    .from(publications)
    .where(eq(publications.authorId, targetId))
    .limit(1);
  if (publication) return true;

  const [viewerTeams, targetTeams] = await Promise.all([teamIdsOf(viewerId), teamIdsOf(targetId)]);
  if (viewerTeams.length === 0 || targetTeams.length === 0) return false;

  // Un match entre l'une de ses équipes et l'une des miennes, quel qu'en soit
  // l'état : un match annulé a quand même mis les deux coachs en rapport.
  const [sharedMatch] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      or(
        and(inArray(matches.homeTeamId, viewerTeams), inArray(matches.awayTeamId, targetTeams)),
        and(inArray(matches.homeTeamId, targetTeams), inArray(matches.awayTeamId, viewerTeams)),
      ),
    )
    .limit(1);
  if (sharedMatch) return true;

  // Un tournoi en commun : organisé par l'un et rejoint par l'autre, ou rejoint
  // par les deux. Deux lectures puis une intersection en mémoire — les tournois
  // d'un coach se comptent sur les doigts d'une main, et une sous-requête SQL
  // à deux jointures sur la même table serait illisible pour le même résultat.
  const [viewerTournaments, targetTournaments] = await Promise.all([
    tournamentIdsAround(viewerTeams),
    tournamentIdsAround(targetTeams),
  ]);
  if ([...viewerTournaments].some((id) => targetTournaments.has(id))) return true;

  // Publier, c'est se montrer : une annonce encore visible sur le radar ouvre
  // la carte de son auteur à ceux qui peuvent la lire.
  const [openAnnouncement] = await db
    .select({ id: matchAnnouncements.id })
    .from(matchAnnouncements)
    .where(
      and(
        inArray(matchAnnouncements.teamId, targetTeams),
        eq(matchAnnouncements.status, "open"),
        gte(matchAnnouncements.date, todayIso()),
      ),
    )
    .limit(1);
  if (openAnnouncement) return true;

  // Répondre, c'est se présenter : une de ses équipes a proposé de jouer une
  // de MES annonces — je dois pouvoir voir qui propose avant de trancher. La
  // visibilité survit à la décision : une proposition déclinée a quand même
  // été faite, comme un match annulé a quand même mis les coachs en rapport.
  const [respondedToMine] = await db
    .select({ id: announcementResponses.id })
    .from(announcementResponses)
    .innerJoin(matchAnnouncements, eq(announcementResponses.announcementId, matchAnnouncements.id))
    .where(
      and(
        inArray(matchAnnouncements.teamId, viewerTeams),
        inArray(announcementResponses.teamId, targetTeams),
      ),
    )
    .limit(1);
  return respondedToMine != null;
}

/**
 * Le coach qui représente une équipe : son coach principal, à défaut le premier
 * affecté. Une équipe peut en compter plusieurs ; il en faut UN pour porter la
 * carte, et le principal est le seul choix qui ne dépende pas du hasard.
 */
export async function representativeCoachOf(teamId: string): Promise<CoachRefDto | null> {
  const [row] = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      avatarPath: users.avatarPath,
      role: teamCoaches.role,
    })
    .from(teamCoaches)
    .innerJoin(users, eq(teamCoaches.coachId, users.id))
    .where(eq(teamCoaches.teamId, teamId))
    // « principal » avant « adjoint », puis le plus ancien
    .orderBy(asc(teamCoaches.role), asc(teamCoaches.createdAt))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: avatarUrlOf(row.avatarPath),
  };
}

/** Représentants de plusieurs équipes en une fois — pour les listes */
export async function representativeCoachesOf(teamIds: string[]): Promise<Map<string, CoachRefDto>> {
  const byTeam = new Map<string, CoachRefDto>();
  if (teamIds.length === 0) return byTeam;
  const rows = await db
    .select({
      teamId: teamCoaches.teamId,
      id: users.id,
      nickname: users.nickname,
      avatarPath: users.avatarPath,
      role: teamCoaches.role,
    })
    .from(teamCoaches)
    .innerJoin(users, eq(teamCoaches.coachId, users.id))
    .where(inArray(teamCoaches.teamId, teamIds))
    .orderBy(asc(teamCoaches.role), asc(teamCoaches.createdAt));
  // La première ligne rencontrée pour une équipe est la bonne : le tri place
  // déjà le principal, puis le plus ancien.
  for (const row of rows) {
    if (byTeam.has(row.teamId)) continue;
    byTeam.set(row.teamId, {
      id: row.id,
      nickname: row.nickname,
      avatarUrl: avatarUrlOf(row.avatarPath),
    });
  }
  return byTeam;
}

/** La carte d'un coach. Ne vérifie AUCUN droit — l'appelant s'en charge. */
export async function buildCoachCard(coachId: string): Promise<CoachCardDto | null> {
  const [coach] = await db.select().from(users).where(eq(users.id, coachId));
  if (!coach || coach.role !== "coach") return null;

  // Son équipe principale : la première qu'il encadre, celle qui le situe
  const [team] = await db
    .select({ name: teams.name, category: teams.category })
    .from(teamCoaches)
    .innerJoin(teams, eq(teamCoaches.teamId, teams.id))
    .where(eq(teamCoaches.coachId, coachId))
    .orderBy(asc(teamCoaches.role), asc(teamCoaches.createdAt))
    .limit(1);

  const [points, matchesPlayed] = await Promise.all([totalPointsOf(coachId), matchesPlayedBy(coachId)]);
  return {
    id: coach.id,
    nickname: coach.nickname,
    avatarUrl: avatarUrlOf(coach.avatarPath),
    // Aucun club n'est rattaché en V1 : l'équipe tient ce rôle sur la carte
    clubLabel: team?.name ?? null,
    teamCategory: asMatchCategory(team?.category),
    level: levelForPoints(points),
    points,
    matchesPlayed,
    categories: asCoachCategories(coach.coachCategories),
  };
}
