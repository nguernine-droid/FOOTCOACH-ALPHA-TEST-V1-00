import assert from "node:assert/strict";
import test from "node:test";
import { departmentLabel, matchRate, DISTRICT_MIN_ANNOUNCEMENTS } from "@teamnexus/shared";
import { cityCoords } from "./cities.js";
import { departmentOf } from "./districts.js";

/**
 * Rattachement d'une ville à son département. L'annuaire est le jumeau de
 * celui des coordonnées : ce qui a un point sur le radar doit avoir une ligne
 * dans le tableau, faute de quoi un département entier disparaîtrait des
 * chiffres sans que personne le remarque.
 */

test("les villes courantes tombent dans le bon département", () => {
  assert.equal(departmentOf("Lyon"), "69");
  assert.equal(departmentOf("Villeurbanne"), "69");
  assert.equal(departmentOf("Paris"), "75");
  assert.equal(departmentOf("Nantes"), "44");
  assert.equal(departmentOf("Marseille"), "13");
});

test("la casse et les accents ne changent rien", () => {
  assert.equal(departmentOf("SAINT-ÉTIENNE"), departmentOf("saint-etienne"));
  assert.equal(departmentOf("  Lyon  "), "69");
});

test("une ville inconnue ne se devine pas", () => {
  // Rattacher au hasard gonflerait les chiffres d'un département innocent
  assert.equal(departmentOf("Ville Qui N'Existe Pas"), null);
  assert.equal(departmentOf(""), null);
  assert.equal(departmentOf(null), null);
});

test("les deux annuaires couvrent les mêmes villes", () => {
  // Une ville avec des coordonnées mais sans département serait un point sur le
  // radar qu'aucun tableau ne saurait compter — exactement ce qu'on veut éviter.
  for (const city of ["Lyon", "Villeurbanne", "Alès", "Sète", "Frontignan", "Bastia", "Fort-de-France"]) {
    const coords = cityCoords(city);
    const dep = departmentOf(city);
    assert.ok(coords, `${city} : pas de coordonnées`);
    assert.ok(dep, `${city} : pas de département`);
  }
});

test("l'outre-mer est couvert", () => {
  assert.equal(departmentOf("Fort-de-France"), "972");
  assert.equal(departmentOf("Cayenne"), "973");
  assert.equal(departmentOf("Mamoudzou"), "976");
});

test("un nom partagé par plusieurs départements en retient UN seul", () => {
  // Limite connue et assumée, héritée de l'annuaire des coordonnées : ~2 300
  // noms de commune existent dans plusieurs départements, et le nom seul ne
  // lève pas l'ambiguïté. « Saint-Denis » tombe ainsi dans l'Aude et non en
  // Seine-Saint-Denis.
  //
  // Ce test fige le comportement plutôt que de le corriger : la corriger
  // demanderait de saisir le code postal à l'inscription, ce qui est un vrai
  // sujet — mais il vaut mieux une approximation documentée qu'une
  // approximation ignorée.
  assert.equal(departmentOf("Saint-Denis"), "11");
  // Les villes sans homonyme, elles, sont exactes — c'est le cas courant
  assert.equal(departmentOf("Villeurbanne"), "69");
  assert.equal(departmentOf("Bobigny"), "93");
});

test("le libellé associe le nom et le code", () => {
  assert.equal(departmentLabel("69"), "Rhône (69)");
  assert.equal(departmentLabel("2A"), "Corse-du-Sud (2A)");
  // Un code inconnu se rend tel quel plutôt que de disparaître
  assert.equal(departmentLabel("XX"), "XX");
});

test("le taux d'appariement se tait sur un échantillon trop mince", () => {
  const base = {
    code: "69",
    label: "Rhône (69)",
    coaches: 3,
    teams: 4,
    announcements: DISTRICT_MIN_ANNOUNCEMENTS - 1,
    announcementsMatched: 4,
    availabilities: 0,
    matchesPlayed: 0,
  };
  assert.equal(matchRate(base), null);
  assert.equal(matchRate({ ...base, announcements: 10, announcementsMatched: 8 }), 0.8);
});
