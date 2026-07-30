import "../test/env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import { MAX_FAILURES_PER_ACCOUNT, emailKey, tooManyFailures } from "./loginThrottle.js";

/**
 * Non-régression FC-07 — frein sur le devinage de mot de passe, partagé entre
 * réplicas.
 *
 * Les compteurs de @fastify/rate-limit vivent dans la mémoire de chaque
 * processus : avec `--scale api=3`, encouragé par le README, un attaquant
 * obtient trois fois le plafond sans rien faire de particulier.
 *
 * Ici la décision et le hachage, qui ne demandent pas de base. Le comportement
 * de bout en bout — onzième tentative refusée, comptes voisins épargnés — est
 * couvert par `src/test/loginThrottle.integration.test.ts`, qui a besoin d'un
 * Postgres.
 */

test("le seuil se déclenche à la limite, pas avant", () => {
  assert.equal(tooManyFailures(0), false);
  assert.equal(tooManyFailures(MAX_FAILURES_PER_ACCOUNT - 1), false, "le dernier essai toléré doit passer");
  assert.equal(tooManyFailures(MAX_FAILURES_PER_ACCOUNT), true);
  assert.equal(tooManyFailures(MAX_FAILURES_PER_ACCOUNT + 50), true);
});

test("le seuil laisse de la place à un coach qui se trompe", () => {
  // Un frein trop serré est une panne : trois erreurs de frappe ne doivent pas
  // fermer un compte. Dix essais en quinze minutes, si.
  assert.ok(MAX_FAILURES_PER_ACCOUNT >= 5, "en dessous de 5, le frein gênerait un usage normal");
  assert.ok(MAX_FAILURES_PER_ACCOUNT <= 20, "au-dessus de 20, il ne freine plus rien d'utile");
});

test("la clé de comptage ne contient jamais l'adresse en clair", () => {
  const key = emailKey("Coach.A@Demo.FR");
  assert.doesNotMatch(key, /coach|demo|@/i, "l'adresse ne doit pas être lisible dans la clé");
  assert.match(key, /^[0-9a-f]{64}$/, "empreinte SHA-256 hexadécimale");
});

test("la clé est stable malgré la casse et les espaces", () => {
  const reference = emailKey("coach.a@demo.fr");
  for (const variant of ["Coach.A@Demo.fr", "  coach.a@demo.fr  ", "COACH.A@DEMO.FR"]) {
    assert.equal(emailKey(variant), reference, `« ${variant} » doit viser le même compteur`);
  }
});

test("deux comptes distincts ont des compteurs distincts", () => {
  assert.notEqual(emailKey("coach.a@demo.fr"), emailKey("coach.b@demo.fr"));
});
