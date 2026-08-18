import { and, eq, gte, inArray, ne, notInArray, or } from "drizzle-orm";
import {
  announcementCategoryOf,
  asDivisionLevel,
  asMatchCategory,
  asMatchGender,
  availabilitiesFit,
  AVAILABILITY_DEFAULT_TIME,
  AVAILABILITY_MAX_DAYS_AHEAD,
  hostOf,
  toReliability,
  NO_HISTORY,
  type AvailabilityVenue,
  type DivisionLevel,
  type SuggestionDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { matchAnnouncements, matches, teamAvailabilities, teamCoaches, teams, users } from "../db/schema.js";
import { cityCoords, haversineKm } from "./cities.js";
import { reliabilityOf } from "./reliability.js";
import { teamsSharingCoachWith } from "./teamScope.js";

/**
 * Calcul d'appariement des disponibilités.
 *
 * Sorti des routes parce qu'il sert deux appelants qui n'ont rien à voir :
 * l'écran du coach, qui le demande, et le balayeur des week-ends libres, qui
 * va le chercher tout seul.
 */
/** Aujourd'hui en ISO — une disponibilité passée ne se déclare ni ne se propose */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Date limite acceptée à la déclaration */
export function horizon(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + AVAILABILITY_MAX_DAYS_AHEAD);
  return d.toISOString().slice(0, 10);
}

/**
 * D'où rayonne une ÉQUIPE. Ses coordonnées propres si elle en a, sinon celles
 * de sa ville dans l'annuaire statique — le même repli que le radar.
 *
 * On ne prend pas ici la position réglée par le coach : une disponibilité
 * appartient à l'équipe, et c'est elle qui se déplacera. Un coach en vacances à
 * 300 km ne rend pas son équipe disponible là-bas.
 */
export function teamCoords(team: typeof teams.$inferSelect): { lat: number; lng: number } | null {
  if (team.lat != null && team.lng != null) return { lat: team.lat, lng: team.lng };
  return cityCoords(team.city);
}

export type Row = { availability: typeof teamAvailabilities.$inferSelect; team: typeof teams.$inferSelect };

/** La forme attendue par `availabilitiesFit`, construite depuis une ligne et son équipe */
export function toFitInput(row: Row, fallbackRadiusKm: number | null) {
  return {
    venue: row.availability.venue as AvailabilityVenue,
    acceptedLevels: row.availability.acceptedLevels
      .map((l) => asDivisionLevel(l))
      .filter((l): l is DivisionLevel => l !== null),
    radiusKm: row.availability.radiusKm ?? fallbackRadiusKm,
    team: {
      category: asMatchCategory(row.team.category),
      gender: asMatchGender(row.team.gender),
      level: asDivisionLevel(row.team.level),
    },
  };
}

/**
 * Le cœur de l'appariement : mes disponibilités à venir, croisées avec celles
 * des autres équipes.
 *
 * Rien n'est stocké et rien n'est mis en cache — la liste se recalcule à chaque
 * lecture. Le volume le permet : on ne croise que les dates que J'AI déclarées,
 * et une équipe en déclare quelques dizaines, pas des milliers.
 *
 * Les dates où mon équipe a déjà un match sont écartées : la déclaration n'a
 * pas été retirée, mais elle ne décrit plus la réalité, et proposer un second
 * match le même jour serait une suggestion à jeter.
 */
export async function suggestionsFor(myTeamId: string): Promise<SuggestionDto[]> {
  const [myTeam] = await db.select().from(teams).where(eq(teams.id, myTeamId));
  if (!myTeam) return [];
  // Sans catégorie, aucun appariement n'est calculable : c'est elle qui définit
  // le groupe d'âges. Le client le sait et invite à la régler. Une catégorie
  // que le regroupement ne reconnaît pas est traitée pareil — mieux vaut ne
  // rien proposer qu'apparier sur un groupe deviné.
  const myCategory = announcementCategoryOf(myTeam.category);
  if (!myCategory) return [];

  const mine = await db
    .select()
    .from(teamAvailabilities)
    .where(and(eq(teamAvailabilities.teamId, myTeamId), gte(teamAvailabilities.date, today())));
  if (mine.length === 0) return [];

  const dates = [...new Set(mine.map((a) => a.date))];

  // Dates déjà prises par un match confirmé de mon équipe
  const booked = await db
    .select({ date: matches.date })
    .from(matches)
    .where(
      and(
        or(eq(matches.homeTeamId, myTeamId), eq(matches.awayTeamId, myTeamId)),
        inArray(matches.date, dates),
        ne(matches.status, "cancelled"),
      ),
    );
  const bookedDates = new Set(booked.map((m) => m.date));

  const usable = mine.filter((a) => !bookedDates.has(a.date));
  if (usable.length === 0) return [];
  const usableDates = [...new Set(usable.map((a) => a.date))];

  // Mes équipes et celles qui partagent un encadrant : on ne se propose pas à
  // soi-même, exactement comme au radar.
  const unplayable = await teamsSharingCoachWith(myTeamId);

  const others = await db
    .select({ availability: teamAvailabilities, team: teams })
    .from(teamAvailabilities)
    .innerJoin(teams, eq(teams.id, teamAvailabilities.teamId))
    .where(
      and(
        inArray(teamAvailabilities.date, usableDates),
        unplayable.length > 0 ? notInArray(teamAvailabilities.teamId, unplayable) : undefined,
      ),
    );
  if (others.length === 0) return [];

  // Rayons de repli : celui du radar de chaque coach, quand la disponibilité
  // n'en porte pas. Un seul aller-retour pour toutes les équipes concernées.
  const teamIds = [...new Set(others.map((r) => r.team.id)), myTeamId];
  const radiusRows = await db
    .select({ teamId: teamCoaches.teamId, radiusKm: users.radarRadiusKm })
    .from(teamCoaches)
    .innerJoin(users, eq(users.id, teamCoaches.coachId))
    .where(inArray(teamCoaches.teamId, teamIds));
  const radiusByTeam = new Map<string, number | null>();
  for (const r of radiusRows) if (!radiusByTeam.has(r.teamId)) radiusByTeam.set(r.teamId, r.radiusKm);

  // Mes annonces ouvertes, pour raccrocher la proposition à l'existant
  const openAnnouncements = await db
    .select({ id: matchAnnouncements.id, date: matchAnnouncements.date })
    .from(matchAnnouncements)
    .where(
      and(
        eq(matchAnnouncements.teamId, myTeamId),
        eq(matchAnnouncements.status, "open"),
        inArray(matchAnnouncements.date, usableDates),
      ),
    );
  const announcementByDate = new Map(openAnnouncements.map((a) => [a.date, a.id]));

  // Fiabilité de toutes les équipes candidates, en une requête : c'est ce qui
  // départage deux équipes également disponibles, elle doit donc accompagner
  // chaque suggestion et non se charger à l'ouverture d'une fiche.
  const reliabilities = await reliabilityOf([...new Set(others.map((r) => r.team.id))]);

  const myCoords = teamCoords(myTeam);
  const myFallbackRadius = radiusByTeam.get(myTeamId) ?? null;
  const byDate = new Map<string, Row[]>();
  for (const row of others) {
    const list = byDate.get(row.availability.date);
    if (list) list.push(row);
    else byDate.set(row.availability.date, [row]);
  }

  const suggestions: SuggestionDto[] = [];
  for (const availability of usable) {
    const mineFit = toFitInput({ availability, team: myTeam }, myFallbackRadius);
    for (const row of byDate.get(availability.date) ?? []) {
      const theirCoords = teamCoords(row.team);
      const distanceKm = myCoords && theirCoords ? haversineKm(myCoords, theirCoords) : null;
      const theirsFit = toFitInput(row, radiusByTeam.get(row.team.id) ?? null);
      if (!availabilitiesFit(mineFit, theirsFit, distanceKm)) continue;

      suggestions.push({
        availabilityId: availability.id,
        date: availability.date,
        team: { id: row.team.id, name: row.team.name, city: row.team.city, logoUrl: null },
        coach: null,
        // Le groupe d'âges de la proposition : le mien fait foi, c'est mon
        // équipe qui publiera l'annonce.
        category: myCategory,
        gender: asMatchGender(row.team.gender),
        level: asDivisionLevel(row.team.level),
        distanceKm,
        reliability: reliabilities.get(row.team.id) ?? toReliability(NO_HISTORY),
        host: hostOf(mineFit.venue, theirsFit.venue),
        time: (availability.time ?? row.availability.time ?? AVAILABILITY_DEFAULT_TIME).slice(0, 5),
        announcementId: announcementByDate.get(availability.date) ?? null,
      });
    }
  }

  // Le plus proche d'abord, à date égale : c'est le critère qui décide vraiment
  // quand quatre équipes conviennent toutes.
  suggestions.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  );
  return suggestions;
}
