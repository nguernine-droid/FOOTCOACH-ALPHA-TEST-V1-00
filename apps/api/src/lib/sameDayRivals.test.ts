// Ce module remonte jusqu'au client Postgres, qui exige une configuration
// valide au chargement — aucune connexion n'est ouverte pour autant.
import "../test/env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import { announcementsPairUp, withinRadius } from "./sameDayRivals.js";

/**
 * La mise en relation de deux coachs qui cherchent un match le même jour.
 *
 * ── Ce que ces tests protègent ─────────────────────────────────────────────
 * Deux annonces du même jour et du même groupe d'âges sont, à elles deux, un
 * match qui s'ignore : chacun attend qu'on lui réponde. La règle qui les
 * rapproche doit rester LARGE — c'est tout son intérêt. Un appariement qui se
 * resserrerait (sur l'âge précisé, sur la catégorie fine d'avant le
 * regroupement) ne notifierait plus personne, et l'absence de notification ne
 * se remarque pas : rien ne casse, on ne met simplement plus les coachs en
 * relation.
 */

const LYON = { lat: 45.75, lng: 4.85 };
/** Villeurbanne : cinq kilomètres, le voisin immédiat */
const VILLEURBANNE = { lat: 45.766, lng: 4.88 };
/** Marseille : ~275 km — hors de tout périmètre raisonnable */
const MARSEILLE = { lat: 43.3, lng: 5.37 };

const DIMANCHE = "2026-09-13";
const base = { date: DIMANCHE, category: "U14-U15", gender: "masculin" } as const;

test("même jour, même groupe d'âges : les deux annonces s'appellent", () => {
  assert.equal(announcementsPairUp(base, { ...base }), true);
});

test("l'appariement se fait par GROUPE, jamais sur l'âge précisé", () => {
  // Deux équipes qui ne peuvent aligner que des U14 et des U15 doivent quand
  // même s'entendre : à un an près, un amical se joue.
  assert.equal(announcementsPairUp(base, { ...base, category: "U15" }), true);
  assert.equal(announcementsPairUp({ ...base, category: "U14" }, { ...base, category: "U15" }), true);
});

test("un autre jour ou un autre groupe ne concerne personne", () => {
  assert.equal(announcementsPairUp(base, { ...base, date: "2026-09-20" }), false);
  assert.equal(announcementsPairUp(base, { ...base, category: "U16-U17" }), false);
});

test("le genre suit la règle du radar : mixte entre partout, l'inconnu ne s'oppose pas", () => {
  assert.equal(announcementsPairUp(base, { ...base, gender: "feminin" }), false);
  assert.equal(announcementsPairUp(base, { ...base, gender: "mixte" }), true);
  assert.equal(announcementsPairUp({ ...base, gender: "mixte" }, { ...base, gender: "feminin" }), true);
  // Annonces publiées avant que le genre existe : on ne devine pas.
  assert.equal(announcementsPairUp(base, { ...base, gender: null }), true);
});

test("le périmètre écarte les annonces trop lointaines, et lui seul", () => {
  const items = [
    { name: "voisin", coords: VILLEURBANNE },
    { name: "loin", coords: MARSEILLE },
    { name: "commune inconnue", coords: null },
  ];
  assert.deepEqual(
    withinRadius(items, LYON, 30).map((i) => i.name),
    ["voisin"],
  );
  // Rayon sans limite : tout passe, y compris ce qu'on ne sait pas situer.
  assert.equal(withinRadius(items, LYON, null).length, 3);
});

test("sans position connue, on ne met personne en relation plutôt que d'inventer un secteur", () => {
  assert.deepEqual(withinRadius([{ coords: VILLEURBANNE }], null, 30), []);
  // Sauf si le coach a explicitement retiré toute limite.
  assert.equal(withinRadius([{ coords: VILLEURBANNE }], null, null).length, 1);
});
