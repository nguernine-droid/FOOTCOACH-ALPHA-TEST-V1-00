import assert from "node:assert/strict";
import test from "node:test";
import { fineCategoriesOf, sosCategoryReach } from "@teamnexus/shared";

/**
 * Tranche d'âge réveillée par un SOS : les catégories visées, plus l'année de
 * chaque côté. Ce qui compte ici, ce sont les bords — une alerte qui déborde
 * réveille des coachs pour rien, une alerte trop serrée laisse un coach en
 * panne sans réponse.
 */

test("une catégorie fine s'étend à l'année d'avant et d'après", () => {
  assert.deepEqual([...sosCategoryReach(["U14"])].sort(), ["U13", "U14", "U15"]);
});

test("un groupe d'annonce s'étend depuis ses deux catégories", () => {
  // U14-U15 couvre U14 et U15 : la tranche va donc de U13 à U16.
  assert.deepEqual([...sosCategoryReach(["U14-U15"])].sort(), ["U13", "U14", "U15", "U16"]);
});

test("les bords de l'échelle ne fabriquent pas de catégorie qui n'existe pas", () => {
  assert.deepEqual([...sosCategoryReach(["U6"])].sort(), ["U6", "U7"]);
  assert.deepEqual([...sosCategoryReach(["U20"])].sort(), ["U19", "U20"]);
});

test("Seniors et Vétérans n'ont pas de voisin d'âge", () => {
  assert.deepEqual([...sosCategoryReach(["Seniors"])], ["Seniors"]);
  assert.deepEqual([...sosCategoryReach(["Veterans"])], ["Veterans"]);
  // Et surtout : un SOS Seniors ne réveille pas les U19.
  assert.equal(sosCategoryReach(["Seniors"]).has("U19"), false);
});

test("plusieurs catégories (un tournoi) se cumulent sans doublon", () => {
  const reach = sosCategoryReach(["U10", "U11"]);
  assert.deepEqual([...reach].sort(), ["U10", "U11", "U12", "U9"]);
});

test("ce qui n'est pas une catégorie connue n'élargit rien", () => {
  assert.equal(sosCategoryReach([null, undefined, "U99"]).size, 0);
});

test("les catégories fines d'un groupe sont celles du district", () => {
  assert.deepEqual(fineCategoriesOf("U12-U13"), ["U12", "U13"]);
  // Idempotent : une catégorie fine se rend elle-même.
  assert.deepEqual(fineCategoriesOf("U13"), ["U13"]);
  assert.deepEqual(fineCategoriesOf("Seniors"), ["Seniors"]);
});
