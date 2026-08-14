import { and, asc, eq, gte, inArray, isNull, ne } from "drizzle-orm";
import {
  announcementCategoryOf,
  levelForPoints,
  type CategoryCoachDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { matchAnnouncements, teamCoaches, teams, users } from "../db/schema.js";
import { cityCoords, haversineKm } from "./cities.js";
import { loadOrigin } from "./coachOrigin.js";
import { totalPointsOfMany } from "./points.js";
import { teamLogoUrlOf, avatarUrlOf } from "../routes/auth.js";

/** Date du jour — une annonce dont la date est passée ne cherche plus personne */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Les ÉQUIPES du secteur qui jouent dans le même groupe d'âges que la mienne.
 *
 * Le cœur du voisinage : c'est ce que compte le bandeau du tableau de bord, et
 * c'est sur cette même définition que s'ouvre la visibilité des cartes de coach
 * (voir `canSeeCoachCard`). Une seule fonction, pour que le compteur et la
 * liste ne puissent pas dire deux choses différentes.
 *
 * Périmètre et catégorie sont deux conditions cumulées ; une ville absente de
 * l'annuaire n'est jamais écartée — on ne peut pas affirmer qu'elle est hors
 * rayon, seulement qu'on ne sait pas. C'est la règle partout ailleurs sur le
 * radar.
 */
export async function teamsInMyCategory(coachId: string, myTeamId: string | null) {
  if (!myTeamId) return { category: null, teams: [] as (typeof teams.$inferSelect)[], origin: null };

  const [myTeam] = await db.select().from(teams).where(eq(teams.id, myTeamId));
  const category = myTeam ? announcementCategoryOf(myTeam.category) : null;
  if (!category) return { category: null, teams: [], origin: null };

  const origin = await loadOrigin(coachId, myTeamId);
  const [me] = await db.select({ radiusKm: users.radarRadiusKm }).from(users).where(eq(users.id, coachId));
  const radiusKm = me?.radiusKm ?? null;

  const all = await db.select().from(teams).where(ne(teams.id, myTeamId));
  const inScope = all.filter((team) => {
    if (announcementCategoryOf(team.category) !== category) return false;
    if (!origin || radiusKm === null) return true;
    const coords = cityCoords(team.city);
    if (!coords) return true;
    return haversineKm(origin, coords) <= radiusKm;
  });
  return { category, teams: inScope, origin };
}

/**
 * Les coachs de ces équipes, tels que la liste « coachs de ma catégorie » les
 * montre : surnom, photo, équipe, distance et palier.
 *
 * Un coach qui encadre deux équipes de ma catégorie n'apparaît qu'une fois —
 * c'est une liste de personnes, pas d'affectations. Les comptes désactivés en
 * sont exclus : écrire à quelqu'un qui ne peut plus se connecter n'aide
 * personne.
 */
export async function coachesOfTeams(
  teamRows: (typeof teams.$inferSelect)[],
  origin: { lat: number; lng: number } | null,
): Promise<CategoryCoachDto[]> {
  if (teamRows.length === 0) return [];
  const teamIds = teamRows.map((t) => t.id);

  const rows = await db
    .select({ coach: users, teamId: teamCoaches.teamId })
    .from(teamCoaches)
    .innerJoin(users, eq(teamCoaches.coachId, users.id))
    .where(
      and(
        inArray(teamCoaches.teamId, teamIds),
        eq(users.role, "coach"),
        isNull(users.disabledAt),
      ),
    )
    // Coach principal d'abord : c'est lui qui représente l'équipe
    .orderBy(asc(teamCoaches.role), asc(teamCoaches.createdAt));

  const teamById = new Map(teamRows.map((t) => [t.id, t]));
  const firstTeamOf = new Map<string, typeof teams.$inferSelect>();
  const coachById = new Map<string, typeof users.$inferSelect>();
  for (const row of rows) {
    if (firstTeamOf.has(row.coach.id)) continue;
    const team = teamById.get(row.teamId);
    if (!team) continue;
    firstTeamOf.set(row.coach.id, team);
    coachById.set(row.coach.id, row.coach);
  }

  const coachIds = [...coachById.keys()];
  if (coachIds.length === 0) return [];

  // Une seule lecture pour toute la liste : le palier de chacun, et les équipes
  // qui cherchent un adversaire en ce moment.
  const [points, openAnnouncements] = await Promise.all([
    totalPointsOfMany(coachIds),
    db
      .select({ teamId: matchAnnouncements.teamId })
      .from(matchAnnouncements)
      .where(
        and(
          inArray(matchAnnouncements.teamId, teamIds),
          eq(matchAnnouncements.status, "open"),
          gte(matchAnnouncements.date, todayIso()),
        ),
      ),
  ]);
  const seekingTeamIds = new Set(openAnnouncements.map((a) => a.teamId));

  return coachIds
    .map((id) => {
      const coach = coachById.get(id)!;
      const team = firstTeamOf.get(id)!;
      const coords = cityCoords(team.city);
      return {
        id: coach.id,
        nickname: coach.nickname,
        avatarUrl: avatarUrlOf(coach.avatarPath),
        team: {
          id: team.id,
          name: team.name,
          city: team.city,
          logoUrl: teamLogoUrlOf(team.logoPath),
        },
        distanceKm: origin && coords ? Math.round(haversineKm(origin, coords)) : null,
        level: levelForPoints(points.get(id) ?? 0),
        hasOpenAnnouncement: seekingTeamIds.has(team.id),
      };
    })
    // Les plus proches d'abord ; les distances inconnues à la fin, comme sur le
    // radar. À distance égale, celui qui cherche un adversaire passe devant :
    // c'est avec lui qu'il y a quelque chose à faire tout de suite.
    .sort((a, b) => {
      if (a.distanceKm === null) return b.distanceKm === null ? 0 : 1;
      if (b.distanceKm === null) return -1;
      return (
        a.distanceKm - b.distanceKm ||
        Number(b.hasOpenAnnouncement) - Number(a.hasOpenAnnouncement)
      );
    });
}
