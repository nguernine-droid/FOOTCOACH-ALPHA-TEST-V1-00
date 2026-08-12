import assert from "node:assert/strict";
import test from "node:test";
import {
  coachIdParamSchema,
  idParamSchema,
  responseParamsSchema,
  teamCoachParamsSchema,
} from "@teamnexus/shared";

/**
 * Non-régression FC-11 — identifiants d'objet non validés.
 *
 * `request.params as { id: string }` ne valide rien à l'exécution : la chaîne
 * partait telle quelle dans une comparaison sur une colonne `uuid`, et Postgres
 * répondait par l'erreur 22P02. Le client recevait un 500 anonyme — aucune fuite
 * — mais chaque appel malformé écrivait une erreur complète dans les journaux,
 * que n'importe qui pouvait donc gonfler à volonté pour noyer une attaque réelle
 * dans le bruit.
 */

const VALIDE = "3f2a1c4e-7b8d-4e6f-9a1b-2c3d4e5f6a7b";

test("un UUID bien formé passe", () => {
  assert.deepEqual(idParamSchema.parse({ id: VALIDE }), { id: VALIDE });
});

test("ce qui n'est pas un UUID est refusé avant d'atteindre Postgres", () => {
  for (const id of [
    "pas-un-uuid",
    "1",
    "",
    "3f2a1c4e-7b8d-4e6f-9a1b", // tronqué
    "3f2a1c4e7b8d4e6f9a1b2c3d4e5f6a7b", // sans tirets
    "../../etc/passwd",
    "' OR 1=1 --",
    "3f2a1c4e-7b8d-4e6f-9a1b-2c3d4e5f6a7g", // « g » n'est pas hexadécimal
  ]) {
    assert.equal(idParamSchema.safeParse({ id }).success, false, `« ${id} » doit être refusé`);
  }
});

test("un paramètre absent est refusé", () => {
  assert.equal(idParamSchema.safeParse({}).success, false);
  assert.equal(coachIdParamSchema.safeParse({}).success, false);
});

test("les schémas à deux paramètres exigent les deux", () => {
  assert.equal(teamCoachParamsSchema.safeParse({ id: VALIDE }).success, false);
  assert.equal(teamCoachParamsSchema.safeParse({ id: VALIDE, coachId: VALIDE }).success, true);
  assert.equal(responseParamsSchema.safeParse({ id: VALIDE }).success, false);
  assert.equal(responseParamsSchema.safeParse({ id: VALIDE, responseId: VALIDE }).success, true);
  // Un seul des deux mal formé suffit à refuser
  assert.equal(responseParamsSchema.safeParse({ id: VALIDE, responseId: "x" }).success, false);
});

test("le refus est un ZodError, donc un 400 et non un 500", () => {
  // C'est tout l'intérêt : plugins/errors.ts transforme déjà les ZodError en
  // 400 « Données invalides ». Aucune plomberie supplémentaire.
  const result = idParamSchema.safeParse({ id: "pas-un-uuid" });
  assert.equal(result.success, false);
  assert.equal(result.error?.constructor.name, "ZodError");
});
