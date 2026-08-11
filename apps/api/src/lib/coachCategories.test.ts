import assert from "node:assert/strict";
import test from "node:test";
import { asCoachCategories, registerCoachSchema } from "@footcoach/shared";

/**
 * Casquettes choisies dès l'inscription (joker, contributeur).
 *
 * Elles sont facultatives : ce qui doit tenir, c'est qu'aucune casquette reste
 * une inscription valable — sinon un formulaire qui ne les envoie pas se voit
 * refuser la création de compte, pour une question à laquelle « non » est la
 * réponse la plus courante.
 */

const INSCRIPTION = {
  nickname: "Alex",
  firstName: "Alex",
  lastName: "Martin",
  email: "alex@exemple.fr",
  password: "Vestiaire-Gerland-2026",
  teamName: "FC Exemple",
  teamCity: "Lyon",
  teamCategory: "U13",
  teamGender: "masculin",
  acceptTerms: true,
  acceptResponsibility: true,
} as const;

test("sans casquettes, l'inscription passe et arrive vide plutôt qu'absente", () => {
  for (const candidat of [INSCRIPTION, { ...INSCRIPTION, categories: [] }]) {
    const parsed = registerCoachSchema.safeParse(candidat);
    assert.equal(parsed.success, true);
    // La colonne est NOT NULL avec défaut `{}` : l'insertion doit recevoir un
    // tableau, pas `undefined`.
    assert.deepEqual(parsed.success && parsed.data.categories, []);
  }
});

test("les casquettes connues sont acceptées, les autres refusées", () => {
  assert.equal(
    registerCoachSchema.safeParse({ ...INSCRIPTION, categories: ["joker", "contributeur"] }).success,
    true,
  );
  for (const inconnue of [["arbitre"], ["JOKER"], ["joker", "arbitre"], "joker"]) {
    assert.equal(
      registerCoachSchema.safeParse({ ...INSCRIPTION, categories: inconnue }).success,
      false,
      `${JSON.stringify(inconnue)} ne doit pas être enregistrée`,
    );
  }
});

test("une casquette envoyée deux fois n'entre qu'une fois en base", () => {
  // Le schéma laisse passer le doublon — rien dans un tableau ne l'interdit —,
  // c'est la normalisation faite à l'insertion qui le rattrape.
  const parsed = registerCoachSchema.parse({ ...INSCRIPTION, categories: ["joker", "joker"] });
  assert.deepEqual(asCoachCategories(parsed.categories), ["joker"]);
});
