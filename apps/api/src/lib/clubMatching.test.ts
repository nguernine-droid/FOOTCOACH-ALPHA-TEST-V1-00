import assert from "node:assert/strict";
import test from "node:test";
import { clubKey, clubNamesLookAlike, groupLookAlikeClubs, sameCity } from "./clubMatching.js";

/**
 * Détection du club en double, avant d'en déclarer un second.
 *
 * Ce qui compte ici : reconnaître deux écritures du MÊME club (c'est le but),
 * et ne pas rapprocher deux clubs différents (une question mal posée fait
 * rattacher un coach au mauvais club, ce qui se répare beaucoup moins bien
 * qu'un doublon).
 */

test("la ponctuation, la casse et les accents ne font pas deux clubs", () => {
  assert.equal(clubNamesLookAlike("A.S. Saint-Étienne", "as saint etienne"), true);
  assert.equal(clubNamesLookAlike("FC  Lyon", "fc lyon"), true);
});

test("un nom plus long qui contient l'autre est proposé", () => {
  // Le cas le plus fréquent : un coach écrit « AS Lyon », l'autre a déclaré
  // « AS Lyon Football » — c'est le même club.
  assert.equal(clubNamesLookAlike("AS Lyon", "AS Lyon Football"), true);
  assert.equal(clubNamesLookAlike("AS Lyon Football", "AS Lyon"), true);
});

test("deux clubs sans rapport ne se rapprochent pas", () => {
  assert.equal(clubNamesLookAlike("AS Lyon", "FC Villeurbanne"), false);
  assert.equal(clubNamesLookAlike("Olympique Bron", "Stade Bressan"), false);
});

test("une saisie trop courte ne rapproche rien", () => {
  // Sans cette borne, « A » remonterait tous les clubs de la ville.
  assert.equal(clubNamesLookAlike("A", "AS Lyon"), false);
  assert.equal(clubNamesLookAlike("", "AS Lyon"), false);
});

test("la ville se compare aux accents près, mais doit être la même", () => {
  assert.equal(sameCity("Saint-Étienne", "saint etienne"), true);
  assert.equal(sameCity("Lyon", "Villeurbanne"), false);
  // Une ville vide ne vaut pas « toutes les villes »
  assert.equal(sameCity("", ""), false);
});

test("la forme comparable retire tout ce qui ne distingue pas", () => {
  assert.equal(clubKey("  A.S.  Saint-Étienne  "), "a s saint etienne");
});

/** Regroupement des doublons — la vue que l'admin ouvre pour les rattraper */

test("les écritures d'un même club se retrouvent dans un seul groupe", () => {
  const groups = groupLookAlikeClubs([
    { id: "1", name: "AS Lyon", city: "Lyon" },
    { id: "2", name: "A.S. LYON", city: "lyon" },
    { id: "3", name: "FC Villeurbanne", city: "Villeurbanne" },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].map((c) => c.id).sort(),
    ["1", "2"],
  );
});

test("le rapprochement est transitif : A~B et B~C font un seul groupe", () => {
  // « AS Lyon » et « Lyon Football » ne se ressemblent pas directement, mais
  // les deux ressemblent à « AS Lyon Football » : mieux vaut les trois d'un
  // coup que deux groupes qui se recoupent.
  const groups = groupLookAlikeClubs([
    { id: "1", name: "AS Lyon", city: "Lyon" },
    { id: "2", name: "AS Lyon Football", city: "Lyon" },
    { id: "3", name: "Lyon Football", city: "Lyon" },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 3);
});

test("le même nom dans deux villes n'est pas un doublon", () => {
  // Le garde-fou essentiel : « AS Saint-Martin » existe dans vingt départements.
  const groups = groupLookAlikeClubs([
    { id: "1", name: "AS Saint-Martin", city: "Lyon" },
    { id: "2", name: "AS Saint-Martin", city: "Rennes" },
  ]);
  assert.deepEqual(groups, []);
});

test("un club seul de son espèce ne forme pas un groupe", () => {
  assert.deepEqual(groupLookAlikeClubs([{ id: "1", name: "AS Lyon", city: "Lyon" }]), []);
  assert.deepEqual(groupLookAlikeClubs([]), []);
});
