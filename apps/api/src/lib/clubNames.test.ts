import assert from "node:assert/strict";
import test from "node:test";
import { prettifyClubName } from "./clubNames.js";

/**
 * La remise en casse est la seule partie de la suggestion qui transforme le
 * texte : ce que cette fonction produit est ce que le coach verra, et souvent
 * ce qu'il enregistrera tel quel. Le reste du module dépend d'un service tiers
 * et n'est pas testable ici.
 */
test("les capitales de SIRENE deviennent une casse lisible", () => {
  assert.equal(prettifyClubName("OLYMPIQUE LYON SUD"), "Olympique Lyon Sud");
  assert.equal(prettifyClubName("ENTENTE SPORTIVE VILLEURBANNE"), "Entente Sportive Villeurbanne");
});

test("les sigles de club restent en capitales", () => {
  assert.equal(prettifyClubName("FC BRON"), "FC Bron");
  assert.equal(prettifyClubName("AS SAINT-PRIEST"), "AS Saint-Priest");
  assert.equal(prettifyClubName("US MEYZIEU"), "US Meyzieu");
  // « Ac » au milieu d'un mot n'est pas un sigle : seuls les mots entiers
  // remontent en capitales.
  assert.equal(prettifyClubName("ACADEMIE DU FOOT"), "Academie du Foot");
});

test("les particules restent basses, sauf en tête", () => {
  assert.equal(prettifyClubName("COUZON-AU-MONT-D'OR"), "Couzon-au-Mont-d'Or");
  assert.equal(prettifyClubName("COMITE OLYMPIQUE ET SPORTIF"), "Comite Olympique et Sportif");
  // Une particule qui ouvre le nom garde sa majuscule
  assert.equal(prettifyClubName("LE PUY FOOT"), "Le Puy Foot");
  assert.equal(prettifyClubName("LA ROCHE VENDEE"), "La Roche Vendee");
});

test("les mots composés prennent une majuscule à chaque partie", () => {
  assert.equal(prettifyClubName("SAINT-GENIS-LAVAL"), "Saint-Genis-Laval");
  assert.equal(prettifyClubName("L'ETRAT"), "L'Etrat");
});

test("les accents absents de SIRENE ne sont pas devinés", () => {
  // « Comite » resterait « Comité » pour l'un et « Comite » pour l'autre :
  // une suggestion est un point de départ, pas une vérité.
  assert.equal(prettifyClubName("COMITE DEPARTEMENTAL"), "Comite Departemental");
});
