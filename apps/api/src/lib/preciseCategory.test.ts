import assert from "node:assert/strict";
import test from "node:test";
import {
  announcementCategoryLabel,
  announcementCategoryOf,
  createAnnouncementSchema,
  precisableCategoriesOf,
} from "@teamnexus/shared";

/**
 * L'âge précisé dans une annonce (U14 sur une annonce U14-U15).
 *
 * ── Ce que ces tests protègent ─────────────────────────────────────────────
 * La paire d'âges reste ce qui APPARIE les équipes : c'est elle qui remplit le
 * radar, et un U14 joue très bien un U15. La précision ne doit donc jamais se
 * substituer à la catégorie — sinon deux annonces d'un même groupe cesseraient
 * de se voir, et le radar se viderait de moitié sans que personne ne l'ait
 * demandé.
 */

const ANNONCE = {
  date: "2026-09-13",
  time: "15:00",
  city: "Lyon",
  stadium: "Stade Municipal",
  category: "U14-U15",
  gender: "masculin",
  level: null,
  format: "11v11",
} as const;

test("seules les catégories à deux âges laissent préciser", () => {
  assert.deepEqual(precisableCategoriesOf("U14-U15"), ["U14", "U15"]);
  assert.deepEqual(precisableCategoriesOf("U12-U13"), ["U12", "U13"]);
  // Rien à préciser : la catégorie ne couvre qu'un âge — le formulaire
  // n'affiche alors aucun choix.
  assert.deepEqual(precisableCategoriesOf("U20"), []);
  assert.deepEqual(precisableCategoriesOf("Seniors"), []);
  assert.deepEqual(precisableCategoriesOf("Veterans"), []);
  assert.deepEqual(precisableCategoriesOf(null), []);
});

test("l'âge précisé doit appartenir au groupe annoncé", () => {
  assert.equal(createAnnouncementSchema.safeParse({ ...ANNONCE, preciseCategory: "U14" }).success, true);
  assert.equal(createAnnouncementSchema.safeParse({ ...ANNONCE, preciseCategory: "U15" }).success, true);
  for (const hors of ["U16", "U13", "Seniors"]) {
    assert.equal(
      createAnnouncementSchema.safeParse({ ...ANNONCE, preciseCategory: hors }).success,
      false,
      `${hors} n'appartient pas aux U14-U15`,
    );
  }
});

test("ne rien préciser est le cas ordinaire, et reste valable", () => {
  for (const valeur of [undefined, null]) {
    assert.equal(createAnnouncementSchema.safeParse({ ...ANNONCE, preciseCategory: valeur }).success, true);
  }
  // Y compris là où il n'y a rien à préciser.
  assert.equal(
    createAnnouncementSchema.safeParse({ ...ANNONCE, category: "Seniors", preciseCategory: null }).success,
    true,
  );
});

test("préciser un âge ne change pas le groupe qui apparie les équipes", () => {
  // C'est l'invariant qui compte : deux annonces U14-U15, l'une précisée U14 et
  // l'autre U15, restent dans le même groupe et continuent donc de se voir.
  const groupe = announcementCategoryOf("U14-U15");
  assert.equal(announcementCategoryOf(ANNONCE.category), groupe);
  assert.equal(groupe, "U14-U15");
});

test("le libellé garde la paire en tête et met la précision entre parenthèses", () => {
  assert.equal(announcementCategoryLabel({ category: "U14-U15", preciseCategory: "U14" }), "U14-U15 (U14)");
  assert.equal(announcementCategoryLabel({ category: "U14-U15", preciseCategory: null }), "U14-U15");
  // Les accents des libellés restent ceux de `categoryLabel` : « Vétérans » et
  // non « Veterans ».
  assert.equal(announcementCategoryLabel({ category: "Veterans" }), "Vétérans");
});
