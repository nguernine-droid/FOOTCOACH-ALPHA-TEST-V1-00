// Ce module remonte jusqu'au client Postgres, qui exige une configuration
// valide au chargement — aucune connexion n'est ouverte pour autant.
import "../test/env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import { SUGGESTION_DATE_WINDOW_DAYS, SUGGESTION_LIMIT } from "@teamnexus/shared";
import {
  SUGGESTION_WEIGHTS,
  dateProximityScore,
  dayGap,
  distanceScore,
  freshnessScore,
  levelGapBetween,
  levelGapScore,
  rankCandidates,
  scoreCandidate,
  type ScoredCandidate,
  type SuggestionDraft,
} from "./announcementSuggestions.js";

/**
 * Le classement des correspondances décide de ce qu'un coach voit au moment le
 * plus décisif du parcours — juste avant de publier. Ce qu'on éprouve ici n'est
 * donc pas « le calcul tourne » mais les promesses qu'il fait : une échelle
 * bornée, une ignorance qui ne condamne pas, et un ordre qu'on peut défendre
 * devant celui dont l'annonce arrive deuxième.
 */

const NOW = new Date("2026-09-10T12:00:00Z");

function announcement(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "a1",
    teamId: "t1",
    date: "2026-09-20",
    time: "15:00:00",
    city: "Lyon",
    stadium: "Stade municipal",
    venueId: null,
    venueLat: null,
    venueLng: null,
    category: "U14-U15",
    preciseCategory: null,
    gender: "masculin",
    level: null,
    format: "11v11",
    comment: null,
    status: "open",
    viewCount: 0,
    federationDeclared: false,
    isSos: false,
    sosReason: null,
    sosDetails: null,
    sosAlertedAt: null,
    sosWidenedAt: null,
    createdAt: NOW,
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function team(over: Partial<Record<string, unknown>> = {}) {
  return { id: "t1", name: "AS Test", city: "Lyon", level: null, ...over } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const draft: SuggestionDraft = {
  date: "2026-09-20",
  category: "U14-U15",
  gender: "masculin",
  level: null,
};

/** Là où se tient le coach : c'est de CHEZ LUI que se mesurent les distances. */
const LYON = { lat: 45.75, lng: 4.85 };

/* ── Proximité de date ──────────────────────────────────────────────────── */

test("la date vaut 100 le jour même et 20 au bord de la fenêtre", () => {
  assert.equal(dateProximityScore(0), 100);
  assert.equal(dateProximityScore(SUGGESTION_DATE_WINDOW_DAYS), 20);
  assert.equal(dateProximityScore(-SUGGESTION_DATE_WINDOW_DAYS), 20);
});

test("la décroissance de date est linéaire et symétrique", () => {
  // Une annonce trois jours avant et une trois jours après valent autant : rien
  // ne dit qu'avancer un match est plus facile que le reculer.
  assert.equal(dateProximityScore(3), dateProximityScore(-3));
  assert.equal(dateProximityScore(1) - dateProximityScore(2), dateProximityScore(2) - dateProximityScore(3));
});

test("au-delà de la fenêtre, la date ne descend pas sous son plancher", () => {
  // Le filtre dur écarte déjà ces annonces ; le score ne doit pas partir en
  // négatif si on l'appelle quand même, sous peine de fausser un total.
  assert.equal(dateProximityScore(40), 20);
});

/* ── Distance ───────────────────────────────────────────────────────────── */

test("sous dix kilomètres, la distance ne départage plus : tout vaut 100", () => {
  assert.equal(distanceScore(0), 100);
  assert.equal(distanceScore(9.9), 100);
});

test("au-delà de cent kilomètres, la distance vaut zéro", () => {
  assert.equal(distanceScore(100), 0);
  assert.equal(distanceScore(400), 0);
});

test("une distance inconnue ne condamne pas l'annonce", () => {
  // Une commune absente de l'annuaire est une lacune de NOTRE annuaire. La
  // classer dernière punirait le club pour ce qu'on ignore de lui.
  const unknown = distanceScore(null);
  assert.ok(unknown > distanceScore(80), "l'inconnu doit rester devant le trop loin");
  assert.ok(unknown < distanceScore(20), "sans l'emporter sur une proximité mesurée");
});

/* ── Niveau ─────────────────────────────────────────────────────────────── */

test("deux crans d'écart de niveau coûtent bien plus qu'un", () => {
  // Le besoin dit « deux crans font un match déséquilibré » : la chute doit
  // s'accélérer, pas suivre une pente régulière.
  const first = levelGapScore(0) - levelGapScore(1);
  const second = levelGapScore(1) - levelGapScore(2);
  assert.ok(second > first, "le second cran doit coûter plus cher que le premier");
});

test("un niveau non déclaré ne se fait pas passer pour un niveau égal", () => {
  assert.ok(levelGapScore(null) < levelGapScore(0));
  assert.ok(levelGapScore(null) > levelGapScore(2));
});

test("l'écart de niveau se mesure sur l'échelle de la catégorie", () => {
  // En U14-U15 les niveaux vont de D4 à R1 en sautant R3 et R2 : « Territoire
  // contre R1 » y est le cran suivant, pas un abîme de trois crans.
  assert.equal(levelGapBetween("U14-U15", "territoire", "r1"), 1);
  // En Seniors, l'échelle est complète et les deux crans manquants comptent.
  assert.equal(levelGapBetween("Seniors", "territoire", "r1"), 3);
});

test("sans niveau des deux côtés, l'écart est inconnu et non nul", () => {
  assert.equal(levelGapBetween("Seniors", null, "d2"), null);
  assert.equal(levelGapBetween("Seniors", "d2", null), null);
});

/* ── Fraîcheur ──────────────────────────────────────────────────────────── */

test("la fraîcheur plafonne les deux premiers jours puis décroît", () => {
  assert.equal(freshnessScore(0), 100);
  assert.equal(freshnessScore(1), 100);
  assert.ok(freshnessScore(7) < freshnessScore(2));
});

test("une vieille annonce garde un plancher : elle reste proposable", () => {
  // Un coach qui n'a pas retiré son annonce n'a pas forcément trouvé ailleurs.
  assert.equal(freshnessScore(21), 20);
  assert.equal(freshnessScore(365), 20);
});

/* ── Le total ───────────────────────────────────────────────────────────── */

test("les poids somment à 1, et le score reste sur l'échelle des critères", () => {
  const total = Object.values(SUGGESTION_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `les poids somment à ${total}`);
});

test("la distance pèse plus que tout autre critère", () => {
  // Le choix est un fait de terrain : en foot amateur, ce sont des parents qui
  // conduisent. Si ce test tombe, c'est que l'équilibre a changé — délibérément
  // ou non, il faut le dire.
  const others = [SUGGESTION_WEIGHTS.date, SUGGESTION_WEIGHTS.level, SUGGESTION_WEIGHTS.freshness];
  assert.ok(others.every((w) => SUGGESTION_WEIGHTS.distance > w));
});

test("l'annonce parfaite marque 100, et rien ne peut la dépasser", () => {
  const perfect = scoreCandidate(
    { ...draft, level: "d2" },
    {
      announcement: announcement({ venueLat: LYON.lat, venueLng: LYON.lng, createdAt: NOW }),
      team: team({ level: "d2" }),
    },
    LYON,
    NOW,
  );
  assert.equal(perfect.score, 100);
});

test("le détail du score dit ce qui a été mesuré, y compris son ignorance", () => {
  const c = scoreCandidate(
    draft,
    { announcement: announcement({ date: "2026-09-22", city: "Zzzz-inconnue" }), team: team() },
    LYON,
    new Date("2026-09-13T12:00:00Z"),
  );
  assert.equal(c.breakdown.dateGapDays, 2, "deux jours APRÈS la date demandée");
  assert.equal(c.breakdown.distanceKm, null, "commune hors annuaire : on ne prétend pas savoir");
  assert.equal(c.breakdown.levelGap, null, "aucun niveau déclaré des deux côtés");
  assert.equal(c.breakdown.ageDays, 3);
});

test("la distance se mesure depuis le coach, pas depuis le lieu qu'il proposait", () => {
  // Retenir une correspondance, c'est aller jouer CHEZ L'AUTRE : le trajet part
  // de chez soi, jamais du terrain qu'on proposait d'ouvrir. Mesurer depuis le
  // brouillon ferait afficher « 0 km » à un coach qui a saisi un terrain neutre
  // à côté de l'adversaire — et le classement mettrait en tête le plus loin.
  const marseille = announcement({ venueLat: 43.3, venueLng: 5.37 });
  const c = scoreCandidate(draft, { announcement: marseille, team: team() }, LYON, NOW);
  assert.ok(c.breakdown.distanceKm !== null && c.breakdown.distanceKm > 250);
});

test("sans savoir où est le coach, aucune distance n'est inventée", () => {
  const c = scoreCandidate(
    draft,
    { announcement: announcement({ venueLat: 43.3, venueLng: 5.37 }), team: team() },
    null,
    NOW,
  );
  assert.equal(c.breakdown.distanceKm, null);
});

test("l'écart de date est signé : une annonce antérieure se distingue d'une postérieure", () => {
  assert.equal(dayGap("2026-09-18", "2026-09-20"), -2);
  assert.equal(dayGap("2026-09-22", "2026-09-20"), 2);
});

/* ── Le classement ──────────────────────────────────────────────────────── */

function scored(id: string, teamId: string, score: number, dateGapDays = 0): ScoredCandidate {
  return {
    announcement: announcement({ id, teamId }),
    team: team({ id: teamId }),
    score,
    breakdown: { dateGapDays, distanceKm: null, levelGap: null, ageDays: 0 },
  };
}

test("le classement plafonne à cinq propositions", () => {
  const many = Array.from({ length: 12 }, (_, i) => scored(`a${i}`, `t${i}`, 100 - i));
  assert.equal(rankCandidates(many).length, SUGGESTION_LIMIT);
});

test("une même équipe n'occupe pas deux places, on garde sa meilleure", () => {
  // Un club qui a publié trois créneaux le même week-end remplirait la liste,
  // et le coach n'aurait qu'un seul interlocuteur au lieu de cinq.
  const ranked = rankCandidates([
    scored("a1", "clubA", 60),
    scored("a2", "clubA", 90),
    scored("a3", "clubB", 70),
  ]);
  assert.deepEqual(
    ranked.map((r) => r.announcement.id),
    ["a2", "a3"],
  );
});

test("à score égal, la date la plus proche tranche", () => {
  const ranked = rankCandidates([scored("loin", "t1", 80, 4), scored("proche", "t2", 80, 1)]);
  assert.equal(ranked[0].announcement.id, "proche");
});

test("sans candidate, le classement rend une liste vide plutôt qu'une erreur", () => {
  // Le cas ORDINAIRE d'une plateforme peu dense : il ne doit rien casser.
  assert.deepEqual(rankCandidates([]), []);
});
