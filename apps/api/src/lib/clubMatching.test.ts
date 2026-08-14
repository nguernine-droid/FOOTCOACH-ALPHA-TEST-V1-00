import assert from "node:assert/strict";
import test from "node:test";
import { clubKey, clubNamesLookAlike, sameCity } from "./clubMatching.js";

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
