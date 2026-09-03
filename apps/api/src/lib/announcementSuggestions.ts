import { and, eq, gte, inArray, lte, notInArray } from "drizzle-orm";
import {
  DIVISION_LEVELS,
  SUGGESTION_DATE_WINDOW_DAYS,
  SUGGESTION_LIMIT,
  asDivisionLevel,
  divisionLevelsFor,
  type AnnouncementSuggestionDto,
  type DivisionLevel,
  type MatchGender,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { announcementResponses, matchAnnouncements, teams } from "../db/schema.js";
import { haversineKm } from "./cities.js";
import { announcementsFit, coordsOf } from "./sameDayRivals.js";

/**
 * ————— Les correspondances proposées à la publication —————
 *
 * Une annonce partait jusqu'ici dans le vide : le coach la publiait, puis
 * attendait qu'une équipe la trouve. Ce module inverse le sens — au moment où
 * il valide son formulaire, on va chercher les annonces DÉJÀ en base qui
 * cherchent le même match, et on les lui montre avant d'enregistrer la sienne.
 *
 * Deux étages, et la distinction compte :
 *
 * - les **filtres durs** disent ce qui ne peut PAS être proposé. Une annonce
 *   qui en manque un seul n'apparaît jamais, quel que soit son score : la
 *   proposer serait proposer un match injouable.
 * - le **score** ne fait qu'ORDONNER ce qui reste. Il n'exclut rien, il ne
 *   décide rien — il met en tête ce qui a le plus de chances d'aboutir, et le
 *   coach garde la main.
 *
 * Aucun des deux n'empêche jamais de publier : les propositions sont un
 * raccourci, et un raccourci qu'on ne prend pas doit laisser la route ouverte.
 */

/**
 * Le poids de chaque critère dans le score final. Ils somment à 1, et chaque
 * sous-score vaut 0 à 100 — le total se lit donc sur la même échelle.
 *
 * La distance domine, et c'est un fait de terrain plutôt qu'un réglage
 * arbitraire : en foot amateur, ce sont des parents qui conduisent le samedi
 * matin. Un adversaire idéal à 90 km ne se joue pas ; un adversaire correct à
 * 15 km se joue. La date vient ensuite, parce qu'elle est le seul critère que
 * le coach a explicitement saisi. Le niveau pèse moins mais réellement — deux
 * crans d'écart font un match déséquilibré, et un match déséquilibré ne se
 * rejoue pas. La fraîcheur ferme la marche : elle ne dit rien du match, elle
 * dit qu'une annonce publiée hier a plus de chances de trouver son coach devant
 * son téléphone qu'une qui traîne depuis trois semaines.
 *
 * Réglable ici et nulle part ailleurs : c'est le seul endroit où l'équilibre du
 * classement se décide.
 */
export const SUGGESTION_WEIGHTS = {
  distance: 0.4,
  date: 0.3,
  level: 0.2,
  freshness: 0.1,
} as const;

/**
 * Ce qu'on accorde à un critère qu'on ne peut pas mesurer — commune absente de
 * l'annuaire, niveau non déclaré. Volontairement au milieu, et volontairement
 * PAS zéro : « je ne sais pas » n'est pas « c'est mauvais ». Reléguer en queue
 * de liste toutes les annonces d'une commune non référencée reviendrait à
 * punir un club de la lacune de notre annuaire.
 */
const UNKNOWN_SCORE = 50;

/** En deçà, un déplacement ne se discute pas : le score plafonne. */
const NEAR_KM = 10;

/** Au-delà, la distance ne départage plus rien — tout est également trop loin. */
const FAR_KM = 100;

/**
 * Proximité de date : 100 le jour même, 20 aux cinq jours d'écart, linéaire
 * entre les deux. Le plancher n'est pas zéro parce qu'une annonce à cinq jours
 * reste une annonce jouable : elle doit pouvoir remonter si tout le reste
 * s'aligne.
 */
export function dateProximityScore(gapDays: number): number {
  const gap = Math.min(Math.abs(gapDays), SUGGESTION_DATE_WINDOW_DAYS);
  return 100 - gap * ((100 - 20) / SUGGESTION_DATE_WINDOW_DAYS);
}

/**
 * Proximité géographique : plein tarif sous {@link NEAR_KM}, décroissance
 * linéaire jusqu'à zéro à {@link FAR_KM}.
 *
 * L'échelle est FIXE et non calée sur le rayon du coach. Un rayon large ne doit
 * pas faire passer 60 km pour proche : le rayon dit jusqu'où il accepte d'aller
 * — c'est un filtre dur, appliqué ailleurs — pas ce qu'il préfère.
 */
export function distanceScore(km: number | null): number {
  if (km === null) return UNKNOWN_SCORE;
  if (km <= NEAR_KM) return 100;
  if (km >= FAR_KM) return 0;
  return 100 * (1 - (km - NEAR_KM) / (FAR_KM - NEAR_KM));
}

/**
 * Équilibre des forces, en crans sur l'échelle des divisions. `null` quand l'un
 * des deux côtés n'a pas déclaré son niveau — on ne prétend alors pas que les
 * équipes sont de force égale, on dit qu'on ne sait pas.
 *
 * La chute est brutale au deuxième cran, et c'est voulu : un D4 contre un
 * Territoire n'est pas un match, c'est une correction. Le proposer une fois
 * fait perdre les deux coachs.
 */
export function levelGapScore(gap: number | null): number {
  if (gap === null) return UNKNOWN_SCORE;
  switch (gap) {
    case 0:
      return 100;
    case 1:
      return 75;
    case 2:
      return 40;
    case 3:
      return 15;
    default:
      return 0;
  }
}

/**
 * Fraîcheur : 100 les deux premiers jours, puis décroissance jusqu'au plancher
 * de 20 à trois semaines.
 *
 * Ce critère ne dit rien de la QUALITÉ du match — il dit qui répondra. Une
 * annonce publiée hier a son coach devant son téléphone ; une annonce de trois
 * semaines a souvent un coach qui a trouvé ailleurs sans penser à la retirer.
 * Le plancher existe parce que ce désintérêt n'est qu'une présomption : une
 * vieille annonce parfaite doit rester proposable.
 */
export function freshnessScore(ageDays: number): number {
  return Math.max(20, 100 - Math.max(0, ageDays - 1) * 4);
}

/**
 * L'écart de niveau, mesuré sur l'échelle de LA CATÉGORIE et non sur la liste
 * complète des divisions.
 *
 * La nuance a des conséquences : en U14-U15 les niveaux vont de D4 à R1 en
 * sautant R3 et R2, et compter sur la liste globale ferait de « Territoire
 * contre R1 » un abîme de trois crans là où c'est le cran suivant. On retombe
 * sur l'échelle globale si l'un des deux niveaux n'appartient pas à la
 * catégorie — une équipe qui a changé de groupe d'âges sans remettre son niveau
 * à jour ne doit pas faire disparaître le critère.
 */
export function levelGapBetween(
  category: string,
  a: DivisionLevel | null,
  b: DivisionLevel | null,
): number | null {
  if (!a || !b) return null;
  const scoped = divisionLevelsFor(category);
  const scale: readonly string[] = scoped.includes(a) && scoped.includes(b) ? scoped : DIVISION_LEVELS;
  const ia = scale.indexOf(a);
  const ib = scale.indexOf(b);
  return ia < 0 || ib < 0 ? null : Math.abs(ia - ib);
}

/** Nombre de jours pleins entre deux dates ISO, signé : négatif = `a` est avant `b`. */
export function dayGap(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/** Le brouillon d'annonce tel que le coach vient de le saisir — rien n'est encore en base. */
export interface SuggestionDraft {
  date: string;
  category: string;
  gender: MatchGender | null;
  /** Niveau souhaité de l'adversaire, à défaut celui de mon équipe */
  level: DivisionLevel | null;
}

/**
 * D'où le coach rayonne : sa position réglée, à défaut la ville de son équipe
 * (`originOf`). `null` quand on ne sait pas le situer.
 *
 * C'est CE point qui sert à mesurer la distance, et non le lieu qu'il vient de
 * saisir dans son brouillon. La nuance décide du bon chiffre : retenir une
 * correspondance, c'est aller jouer chez L'AUTRE — le trajet part de chez soi,
 * pas du terrain qu'on proposait d'ouvrir. Un coach qui publie une rencontre
 * sur un terrain neutre à l'autre bout du département verrait sinon toutes les
 * distances mesurées depuis un endroit où il n'habite pas.
 *
 * C'est aussi ce que fait le radar (`toDto` mesure `myCoords` → lieu du match) :
 * une annonce vue à 12 km sur le radar doit compter pour 12 km ici.
 */
export type CoachOrigin = { lat: number; lng: number } | null;

export interface ScoredCandidate {
  announcement: typeof matchAnnouncements.$inferSelect;
  team: typeof teams.$inferSelect;
  score: number;
  breakdown: AnnouncementSuggestionDto["breakdown"];
}

/**
 * Le score d'une annonce candidate face au brouillon, et son détail.
 *
 * Le détail voyage avec le score parce qu'il ne sert pas à décorer : il permet
 * de dire au coach POURQUOI cette annonce arrive en tête, et rend le classement
 * discutable au lieu d'être un oracle.
 */
export function scoreCandidate(
  draft: SuggestionDraft,
  candidate: {
    announcement: typeof matchAnnouncements.$inferSelect;
    team: typeof teams.$inferSelect;
  },
  origin: CoachOrigin,
  now: Date,
): ScoredCandidate {
  const { announcement, team } = candidate;
  const dateGapDays = dayGap(announcement.date, draft.date);
  const coords = coordsOf(announcement);
  const distanceKm = origin && coords ? haversineKm(origin, coords) : null;
  // Le niveau RÉEL de l'équipe d'en face prime sur celui qu'elle souhaite chez
  // son adversaire : c'est sa force à elle qui dit si le match sera équilibré.
  const theirLevel = asDivisionLevel(team.level) ?? asDivisionLevel(announcement.level);
  const levelGap = levelGapBetween(draft.category, draft.level, theirLevel);
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - announcement.createdAt.getTime()) / 86_400_000),
  );

  const score =
    SUGGESTION_WEIGHTS.date * dateProximityScore(dateGapDays) +
    SUGGESTION_WEIGHTS.distance * distanceScore(distanceKm) +
    SUGGESTION_WEIGHTS.level * levelGapScore(levelGap) +
    SUGGESTION_WEIGHTS.freshness * freshnessScore(ageDays);

  return {
    announcement,
    team,
    score: Math.round(score * 10) / 10,
    breakdown: {
      dateGapDays,
      distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
      levelGap,
      ageDays,
    },
  };
}

/**
 * Classe des candidates déjà filtrées, et n'en garde que les cinq premières.
 *
 * Séparé de la requête pour être éprouvable sans base : c'est ici que vit
 * l'ordre, et l'ordre est ce qui se règle.
 *
 * Une seule annonce par ÉQUIPE : un club qui a publié trois créneaux le même
 * week-end occuperait sinon toute la liste, et le coach n'aurait qu'un seul
 * interlocuteur à qui parler au lieu de cinq. On garde sa meilleure.
 */
export function rankCandidates(scored: ScoredCandidate[], limit = SUGGESTION_LIMIT): ScoredCandidate[] {
  const best = new Map<string, ScoredCandidate>();
  for (const c of scored) {
    const kept = best.get(c.team.id);
    if (!kept || c.score > kept.score) best.set(c.team.id, c);
  }
  return [...best.values()]
    // À score égal, la plus proche dans le temps : c'est le critère que le coach
    // a saisi lui-même, et le seul sur lequel un ex æquo se tranche sans
    // arbitraire.
    .sort(
      (a, b) =>
        b.score - a.score || Math.abs(a.breakdown.dateGapDays) - Math.abs(b.breakdown.dateGapDays),
    )
    .slice(0, limit);
}

/** Date du jour au format ISO court, comme partout ailleurs dans les annonces. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ajoute (ou retranche) des jours à une date ISO, sans passer par le fuseau local. */
function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Les correspondances d'un brouillon d'annonce, filtres durs appliqués et
 * classement fait.
 *
 * Une seule requête, bornée par la fenêtre de dates : c'est ce qui tient la
 * promesse de l'écran intermédiaire. Il s'intercale entre un clic et un
 * enregistrement — au-delà d'une poignée de centaines de millisecondes, le
 * coach décroche et le raccourci devient un obstacle.
 *
 * `totalFound` compte AVANT le plafond d'affichage : cinq propositions au plus
 * arrivent à l'écran, mais savoir qu'il y en avait douze change ce que le coach
 * en fait.
 */
export async function suggestionsFor(options: {
  draft: SuggestionDraft;
  /** Mes équipes et celles qui partagent un encadrant avec la mienne : ces matchs ne peuvent pas se jouer */
  excludeTeamIds: string[];
  /** Mon équipe active — ses propositions déjà envoyées sont des impasses, on les écarte */
  myTeamId: string;
  /** D'où je rayonne — voir {@link CoachOrigin} */
  origin: CoachOrigin;
  /** Mon rayon de radar, `null` = sans limite */
  radiusKm: number | null;
  now?: Date;
}): Promise<{ items: ScoredCandidate[]; totalFound: number }> {
  const { draft, excludeTeamIds, myTeamId, origin, radiusKm } = options;
  const now = options.now ?? new Date();

  // Une date passée ne se propose jamais, même dans la fenêtre : la borne basse
  // est donc la plus tardive des deux.
  const windowStart = shiftDate(draft.date, -SUGGESTION_DATE_WINDOW_DAYS);
  const from = windowStart > today() ? windowStart : today();
  const to = shiftDate(draft.date, SUGGESTION_DATE_WINDOW_DAYS);
  if (from > to) return { items: [], totalFound: 0 };

  const rows = await db
    .select({ announcement: matchAnnouncements, team: teams })
    .from(matchAnnouncements)
    .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
    .where(
      and(
        // « Encore active, pas déjà appariée » : `open` dit exactement les deux.
        eq(matchAnnouncements.status, "open"),
        gte(matchAnnouncements.date, from),
        lte(matchAnnouncements.date, to),
        excludeTeamIds.length > 0 ? notInArray(matchAnnouncements.teamId, excludeTeamIds) : undefined,
      ),
    );

  // Le groupe d'âges et le genre se filtrent en mémoire plutôt qu'en SQL : la
  // fenêtre ne fait que onze jours, et la règle d'appariement n'existe qu'à un
  // seul endroit (`announcementsFit`).
  let candidates = rows.filter((r) => announcementsFit(draft, r.announcement));

  // Une annonce sur laquelle j'ai déjà proposé est une impasse : la route de
  // réponse la refuserait (une seule proposition par équipe et par annonce).
  if (candidates.length > 0) {
    const already = await db
      .select({ announcementId: announcementResponses.announcementId })
      .from(announcementResponses)
      .where(
        and(
          eq(announcementResponses.teamId, myTeamId),
          inArray(
            announcementResponses.announcementId,
            candidates.map((c) => c.announcement.id),
          ),
        ),
      );
    const seen = new Set(already.map((a) => a.announcementId));
    candidates = candidates.filter((c) => !seen.has(c.announcement.id));
  }

  /**
   * ————— Le rayon, filtre dur —————
   * Le périmètre que le coach a réglé n'est pas une préférence : c'est sa
   * phrase « je ne me déplace pas plus loin ». On l'applique comme le radar et
   * les alertes l'appliquent déjà.
   *
   * Deux cas limites, traités comme sur le radar et pour les mêmes raisons :
   *
   * - **je ne sais pas où EST LE COACH** : aucune distance n'est calculable, et
   *   proposer au hasard vaudrait moins que ne rien proposer. On n'affiche rien.
   * - **je ne sais pas où est L'ANNONCE** (commune absente de l'annuaire) : on
   *   la garde. On ne peut pas affirmer qu'elle est hors périmètre, seulement
   *   qu'on l'ignore — et l'écarter punirait un club d'une lacune qui est la
   *   nôtre.
   */
  const all = candidates.map((c) => scoreCandidate(draft, c, origin, now));
  const scored =
    radiusKm === null
      ? all
      : origin === null
        ? []
        : all.filter((c) => c.breakdown.distanceKm === null || c.breakdown.distanceKm <= radiusKm);

  return { items: rankCandidates(scored), totalFound: scored.length };
}
