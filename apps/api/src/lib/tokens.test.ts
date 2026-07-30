import assert from "node:assert/strict";
import test from "node:test";
import { tokensMatch } from "./tokens.js";

/**
 * Non-régression FC-15 — comparaison du jeton de confirmation de score.
 *
 * `input.token !== match.confirmationToken` s'arrête au premier octet qui
 * diffère : sa durée renseigne sur le nombre d'octets corrects. L'exploitation
 * était très théorique — 24 octets aléatoires, appelant déjà coach de l'équipe
 * adverse, bruit réseau — mais un jeton d'authentification ne se compare pas
 * autrement.
 *
 * Ces tests portent sur la CORRECTION de la comparaison : une correction à
 * durée constante qui se tromperait de verdict serait bien pire que le défaut
 * qu'elle remplace.
 */

const JETON = "aB3dEf6hIj9kLm2nOp5qRs8tUv1w";

test("un jeton identique est reconnu", () => {
  assert.equal(tokensMatch(JETON, JETON), true);
});

test("un jeton différent est refusé", () => {
  assert.equal(tokensMatch(JETON, JETON.slice(0, -1) + "X"), false, "dernier octet différent");
  assert.equal(tokensMatch("X" + JETON.slice(1), JETON), false, "premier octet différent");
});

test("des longueurs différentes sont refusées, sans lever d'exception", () => {
  // timingSafeEqual jette si les tailles diffèrent : sans la garde, un jeton
  // trop court aurait produit un 500 au lieu d'un refus.
  assert.equal(tokensMatch("", JETON), false);
  assert.equal(tokensMatch(JETON.slice(0, 10), JETON), false);
  assert.equal(tokensMatch(JETON + "suite", JETON), false);
});

test("aucun jeton attendu : rien ne peut correspondre", () => {
  // Le cas du match sans score en attente. Une comparaison naïve avec null
  // aurait pu réussir sur une chaîne vide.
  assert.equal(tokensMatch("", null), false);
  assert.equal(tokensMatch(JETON, null), false);
  assert.equal(tokensMatch("null", null), false);
});

test("la casse compte", () => {
  assert.equal(tokensMatch(JETON.toUpperCase(), JETON), false);
});
