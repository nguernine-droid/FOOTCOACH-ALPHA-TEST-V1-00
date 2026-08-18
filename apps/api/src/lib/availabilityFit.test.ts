import assert from "node:assert/strict";
import test from "node:test";
import { availabilitiesFit, hostOf, venuesFit, type AvailabilityVenue } from "@teamnexus/shared";

/**
 * Appariement de deux disponibilités déclarées. À la différence de
 * `teamMatchesAnnouncement`, qui se contente d'AVERTIR l'émetteur, cette règle
 * DÉCIDE : ce qu'elle rejette ne sera jamais proposé, et le coach ne saura même
 * pas qu'une équipe était libre en face.
 *
 * D'où le soin porté aux cas d'inconnu. Une équipe sans niveau réglé, sans
 * genre, ou dont la ville est absente de l'annuaire ne doit pas disparaître du
 * secteur : l'ignorance n'est pas un désaccord.
 */

const U13 = { category: "U13", gender: "masculin", level: "D2" } as const;
const U12 = { category: "U12", gender: "masculin", level: "D2" } as const;
const U15 = { category: "U15", gender: "masculin", level: "D2" } as const;

function side(
  team: { category: string | null; gender: string | null; level: string | null },
  overrides: Partial<{ venue: AvailabilityVenue; acceptedLevels: readonly string[]; radiusKm: number | null }> = {},
) {
  return {
    venue: overrides.venue ?? "any",
    acceptedLevels: overrides.acceptedLevels ?? [],
    radiusKm: overrides.radiusKm === undefined ? 50 : overrides.radiusKm,
    team,
  } as Parameters<typeof availabilitiesFit>[0];
}

test("deux équipes du même groupe d'âges s'apparient", () => {
  // U12 et U13 sont le MÊME groupe d'annonce : c'est ainsi que les districts
  // apparient, et l'appariement doit le refléter.
  assert.equal(availabilitiesFit(side(U13), side(U12), 10), true);
});

test("deux groupes d'âges différents ne s'apparient pas", () => {
  assert.equal(availabilitiesFit(side(U13), side(U15), 10), false);
});

test("une catégorie inconnue ne fait pas obstacle", () => {
  const sansCategorie = { category: null, gender: "masculin", level: "D2" };
  assert.equal(availabilitiesFit(side(U13), side(sansCategorie), 10), true);
});

test("une équipe mixte entre partout", () => {
  const feminine = { category: "U13", gender: "feminin", level: "D2" };
  const mixte = { category: "U13", gender: "mixte", level: "D2" };
  assert.equal(availabilitiesFit(side(feminine), side(mixte), 10), true);
  // Deux genres déclarés et différents, en revanche, ne se jouent pas
  assert.equal(availabilitiesFit(side(feminine), side(U13), 10), false);
});

test("il faut un receveur et un visiteur", () => {
  assert.equal(availabilitiesFit(side(U13, { venue: "home" }), side(U12, { venue: "away" }), 10), true);
  assert.equal(availabilitiesFit(side(U13, { venue: "home" }), side(U12, { venue: "home" }), 10), false);
  assert.equal(availabilitiesFit(side(U13, { venue: "away" }), side(U12, { venue: "away" }), 10), false);
});

test("« peu importe » s'accommode de tout, y compris d'un autre « peu importe »", () => {
  assert.equal(venuesFit("any", "home"), true);
  assert.equal(venuesFit("any", "away"), true);
  assert.equal(venuesFit("any", "any"), true);
  // Deux « peu importe » : qui reçoit reste à convenir entre les coachs
  assert.equal(hostOf("any", "any"), null);
  assert.equal(hostOf("home", "any"), "mine");
  assert.equal(hostOf("any", "home"), "theirs");
  assert.equal(hostOf("away", "any"), "theirs");
});

test("un filtre de niveau écarte le niveau qu'il ne veut pas", () => {
  const r1 = { category: "U13", gender: "masculin", level: "R1" };
  assert.equal(availabilitiesFit(side(U13, { acceptedLevels: ["D1", "D2"] }), side(r1), 10), false);
  assert.equal(availabilitiesFit(side(U13, { acceptedLevels: ["D1", "D2", "R1"] }), side(r1), 10), true);
});

test("un filtre de niveau n'écarte pas une équipe dont le niveau est inconnu", () => {
  // Sans quoi toute équipe qui n'a pas réglé son niveau serait invisible pour
  // tous les coachs exigeants, sans jamais savoir pourquoi.
  const sansNiveau = { category: "U13", gender: "masculin", level: null };
  assert.equal(availabilitiesFit(side(U13, { acceptedLevels: ["D1"] }), side(sansNiveau), 10), true);
});

test("le filtre de niveau joue dans les deux sens", () => {
  const r1 = { category: "U13", gender: "masculin", level: "R1" };
  // C'est l'équipe d'EN FACE qui n'accepte pas mon niveau
  assert.equal(availabilitiesFit(side(U13), side(r1, { acceptedLevels: ["R1", "R2"] }), 10), false);
});

test("chacun impose son propre rayon", () => {
  assert.equal(availabilitiesFit(side(U13, { radiusKm: 25 }), side(U12, { radiusKm: 100 }), 40), false);
  assert.equal(availabilitiesFit(side(U13, { radiusKm: 100 }), side(U12, { radiusKm: 25 }), 40), false);
  assert.equal(availabilitiesFit(side(U13, { radiusKm: 50 }), side(U12, { radiusKm: 50 }), 40), true);
});

test("un rayon absent ne borne rien", () => {
  assert.equal(availabilitiesFit(side(U13, { radiusKm: null }), side(U12, { radiusKm: null }), 500), true);
});

test("une distance inconnue ne fait pas obstacle", () => {
  // Ville absente de l'annuaire : mieux vaut proposer et laisser le coach
  // juger que de le priver d'une équipe voisine sur une coordonnée manquante.
  assert.equal(availabilitiesFit(side(U13, { radiusKm: 10 }), side(U12, { radiusKm: 10 }), null), true);
});
