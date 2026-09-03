import { and, eq, gte, inArray, ne, notInArray } from "drizzle-orm";
import { announcementCategoryOf, type MatchGender } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { matchAnnouncements, teams } from "../db/schema.js";
import { cityCoords, haversineKm } from "./cities.js";

/**
 * ————— Les annonces jumelles —————
 *
 * Deux coachs qui cherchent un match le MÊME JOUR dans la MÊME catégorie sont,
 * à eux deux, un match. Ils ne le savent pas toujours : chacun publie, puis
 * attend qu'on lui réponde, et le radar ne se regarde pas toutes les heures.
 * C'est à l'application d'aller le leur dire — c'est ce que ce module trouve,
 * et ce que la notification de publication porte.
 *
 * L'appariement se fait sur le GROUPE d'âges (U14-U15), jamais sur l'âge
 * précisé : un U14 et un U15 se rencontrent très bien, et la précision n'est là
 * que pour être lue avant de proposer.
 */

type Announcement = typeof matchAnnouncements.$inferSelect;

export interface RivalAnnouncement {
  id: string;
  teamId: string;
  teamName: string;
  city: string;
  date: string;
  category: string;
  /** Lieu du match — le terrain retenu, à défaut le centre de la commune */
  coords: { lat: number; lng: number } | null;
}

/**
 * Les genres se croisent-ils ? Même règle que `teamMatchesAnnouncement` : ce
 * qu'on ne sait pas ne s'oppose pas, et « mixte » entre partout.
 */
function genderFits(a: MatchGender | null, b: MatchGender | null): boolean {
  return a === null || b === null || a === b || a === "mixte" || b === "mixte";
}

/**
 * Ces deux annonces cherchent-elles le même TABLEAU ?
 *
 * Le même GROUPE d'âges et des genres compatibles — la date exclue. L'âge
 * précisé n'entre pas dans la comparaison : il se lit sur l'annonce et se
 * discute entre coachs, il ne doit pas empêcher la mise en relation.
 *
 * Séparé de la date parce que deux appelants n'en demandent pas la même chose :
 * les annonces jumelles veulent le jour EXACT (ci-dessous), les correspondances
 * proposées à la publication acceptent une fenêtre de quelques jours
 * (`announcementSuggestions.ts`). La règle de catégorie et de genre, elle, est
 * la même pour les deux et n'a donc à vivre qu'ici.
 */
export function announcementsFit(
  a: { category: string; gender: MatchGender | null },
  b: { category: string; gender: MatchGender | null },
): boolean {
  const group = announcementCategoryOf(a.category);
  return group !== null && announcementCategoryOf(b.category) === group && genderFits(a.gender, b.gender);
}

/**
 * Ces deux annonces cherchent-elles le même match, le même jour ?
 *
 * Seule règle d'appariement du module : les deux fonctions ci-dessous s'y
 * réfèrent, pour qu'un ajustement n'ait jamais à être fait deux fois.
 */
export function announcementsPairUp(
  a: { date: string; category: string; gender: MatchGender | null },
  b: { date: string; category: string; gender: MatchGender | null },
): boolean {
  return a.date === b.date && announcementsFit(a, b);
}

/** Le lieu d'une annonce : son terrain s'il est retenu, sinon sa commune. */
export function coordsOf(a: Pick<Announcement, "venueLat" | "venueLng" | "city">) {
  if (a.venueLat != null && a.venueLng != null) return { lat: a.venueLat, lng: a.venueLng };
  return cityCoords(a.city);
}

/** Ne garde que ce qui tombe dans le périmètre du coach (rayon `null` = sans limite). */
export function withinRadius<T extends { coords: { lat: number; lng: number } | null }>(
  items: T[],
  origin: { lat: number; lng: number } | null,
  radiusKm: number | null,
): T[] {
  if (radiusKm === null) return items;
  // Sans position connue, on ne peut affirmer d'aucune annonce qu'elle est
  // proche : mieux vaut ne mettre personne en relation qu'inventer un secteur.
  if (!origin) return [];
  return items.filter((i) => i.coords !== null && haversineKm(origin, i.coords) <= radiusKm);
}

/**
 * Les annonces ouvertes qui cherchent un adversaire le même jour, dans le même
 * groupe d'âges et un genre compatible. `excludeTeamIds` écarte les équipes qui
 * ne peuvent de toute façon pas jouer contre celle-ci (les siennes, et celles
 * qui partagent un encadrant avec elle).
 */
export async function sameDayRivalsOf(
  announcement: Announcement,
  excludeTeamIds: string[],
): Promise<RivalAnnouncement[]> {
  const group = announcementCategoryOf(announcement.category);
  if (!group) return [];

  const rows = await db
    .select({ announcement: matchAnnouncements, team: teams })
    .from(matchAnnouncements)
    .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
    .where(
      and(
        eq(matchAnnouncements.status, "open"),
        eq(matchAnnouncements.date, announcement.date),
        ne(matchAnnouncements.id, announcement.id),
        excludeTeamIds.length > 0 ? notInArray(matchAnnouncements.teamId, excludeTeamIds) : undefined,
      ),
    );

  // Le groupe d'âges et le genre se filtrent ici plutôt qu'en SQL : les annonces
  // d'une seule journée se comptent sur les doigts, et la règle d'appariement
  // n'existe qu'à un seul endroit (`announcementsPairUp`).
  return rows
    .filter((r) => announcementsPairUp(announcement, r.announcement))
    .map(({ announcement: a, team }) => ({
      id: a.id,
      teamId: a.teamId,
      teamName: team.name,
      city: a.city,
      date: a.date,
      category: a.category,
      coords: coordsOf(a),
    }));
}

/**
 * Combien de concurrents du même jour pour CHACUNE de mes annonces ouvertes —
 * en une seule requête, quel qu'en soit le nombre. Sert le bandeau « d'autres
 * équipes cherchent aussi ce jour-là » de l'écran « Mes annonces ».
 */
export async function sameDayRivalCounts(
  mine: Announcement[],
  excludeTeamIds: string[],
  origin: { lat: number; lng: number } | null,
  radiusKm: number | null,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  // Une annonce pourvue, annulée ou passée ne cherche plus personne : lui
  // compter des concurrents serait proposer une mise en relation sans objet.
  const today = new Date().toISOString().slice(0, 10);
  const open = mine.filter((a) => a.status === "open" && a.date >= today);
  if (open.length === 0) return counts;

  const rows = await db
    .select({ announcement: matchAnnouncements, team: teams })
    .from(matchAnnouncements)
    .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
    .where(
      and(
        eq(matchAnnouncements.status, "open"),
        inArray(matchAnnouncements.date, [...new Set(open.map((a) => a.date))]),
        gte(matchAnnouncements.date, today),
        excludeTeamIds.length > 0 ? notInArray(matchAnnouncements.teamId, excludeTeamIds) : undefined,
      ),
    );

  const others = rows.map(({ announcement: a, team }) => ({
    date: a.date,
    category: a.category,
    gender: a.gender,
    teamId: a.teamId,
    teamName: team.name,
    coords: coordsOf(a),
  }));

  for (const a of open) {
    const rivals = others.filter((o) => announcementsPairUp(a, o));
    // Par ÉQUIPE et non par annonce : une équipe qui a publié deux créneaux le
    // même jour reste un seul confrère à appeler.
    const nearby = withinRadius(rivals, origin, radiusKm);
    counts.set(a.id, new Set(nearby.map((r) => r.teamId)).size);
  }
  return counts;
}
