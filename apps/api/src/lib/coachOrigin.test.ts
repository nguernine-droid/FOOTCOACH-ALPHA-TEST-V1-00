// Ce module remonte jusqu'au client Postgres, qui exige une configuration
// valide au chargement — aucune connexion n'est ouverte pour autant.
import "../test/env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import { originOf } from "./coachOrigin.js";

/**
 * D'OÙ RAYONNE UN COACH.
 *
 * ── Ce que ces tests protègent ─────────────────────────────────────────────
 * Presque tout ce qui situe un coach en dépend : les distances du radar, le
 * périmètre des alertes de publication, et le comptage des confrères qui
 * cherchent un match le même jour. Un coach sans origine ne les perd pas
 * bruyamment — il n'a simplement plus de distances, plus d'alertes, plus de
 * mise en relation. Rien ne casse, rien ne s'affiche, personne ne le signale.
 *
 * C'est exactement ce qui s'est produit en production : une équipe créée avant
 * que sa commune n'entre dans l'annuaire (« Valras ») portait une fiche sans
 * coordonnées, et son coach n'était mis en relation avec personne alors qu'une
 * autre équipe cherchait le même match, à douze kilomètres.
 */

/** Un coach qui n'a rien réglé lui-même — le cas de très loin le plus courant */
const SANS_POSITION = { lat: null, lng: null, locationLabel: null, locationSource: null };

test("la position réglée par le coach passe avant tout le reste", () => {
  const origin = originOf(
    { lat: 45.75, lng: 4.85, locationLabel: "Bron, Rhône", locationSource: "gps" as const },
    { city: "Marseille", lat: 43.3, lng: 5.37 },
  );
  assert.deepEqual(origin, { lat: 45.75, lng: 4.85, label: "Bron, Rhône", source: "gps" });
});

test("à défaut, les coordonnées portées par la fiche de l'équipe", () => {
  const origin = originOf(SANS_POSITION, { city: "Beziers", lat: 43.3481, lng: 3.2342 });
  assert.deepEqual(origin, { lat: 43.3481, lng: 3.2342, label: "Beziers", source: "team" });
});

test("une fiche sans coordonnées se rattrape sur la commune", () => {
  // Le correctif. Sans lui, ce coach n'avait AUCUNE origine — donc pas de
  // distances au radar, pas d'alerte de publication, et aucun confrère compté
  // le même jour.
  const origin = originOf(SANS_POSITION, { city: "Valras", lat: null, lng: null });
  assert.ok(origin, "une commune de l'annuaire doit suffire à situer le coach");
  assert.equal(origin.source, "team");
  assert.equal(origin.label, "Valras");
  // Valras-Plage, dont « Valras » est l'alias : sur la côte héraultaise.
  assert.ok(Math.abs(origin.lat - 43.25) < 0.1, `latitude inattendue : ${origin.lat}`);
  assert.ok(Math.abs(origin.lng - 3.29) < 0.1, `longitude inattendue : ${origin.lng}`);
});

test("le repli garde `team` pour source : le coach n'a rien réglé, dans les deux cas", () => {
  const fiche = originOf(SANS_POSITION, { city: "Beziers", lat: 43.3481, lng: 3.2342 });
  const annuaire = originOf(SANS_POSITION, { city: "Valras", lat: null, lng: null });
  assert.equal(fiche?.source, annuaire?.source);
});

test("une commune inconnue de l'annuaire ne produit pas de position inventée", () => {
  // Le principe tient toujours : mieux vaut aucune distance qu'une fausse.
  assert.equal(originOf(SANS_POSITION, { city: "Zzzz-sur-Néant", lat: null, lng: null }), null);
});

test("sans équipe active, il n'y a rien à deviner", () => {
  assert.equal(originOf(SANS_POSITION, null), null);
});
