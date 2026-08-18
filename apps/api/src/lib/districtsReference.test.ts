import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { DEPARTMENT_NAMES, DEPARTMENTS_WITHOUT_DISTRICT } from "@teamnexus/shared";

/**
 * Intégrité du référentiel des districts.
 *
 * Ce fichier est le seul endroit du dépôt où une donnée métier est écrite à la
 * main plutôt que produite par le code. Il mérite donc les mêmes garde-fous
 * qu'une migration : ce qui casserait l'import doit casser ici, pendant les
 * tests, et pas au déploiement.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reference = JSON.parse(
  fs.readFileSync(path.join(__dirname, "districtsReference.json"), "utf-8"),
) as {
  name: string;
  slug: string;
  legalName: string | null;
  siren: string | null;
  city: string | null;
  departments: string[];
  source: "annuaire" | "manuel";
}[];

test("le référentiel n'est pas vide et couvre l'ordre de grandeur attendu", () => {
  // La fédération compte environ quatre-vingt-dix districts : un fichier tombé
  // à dix lignes après une fausse manœuvre doit se voir immédiatement.
  assert.ok(reference.length >= 85, `seulement ${reference.length} districts`);
  assert.ok(reference.length <= 120, `${reference.length} districts, c'est trop`);
});

test("chaque district a un slug unique", () => {
  const slugs = new Set<string>();
  for (const row of reference) {
    assert.ok(row.slug, `${row.name} n'a pas de slug`);
    assert.ok(!slugs.has(row.slug), `slug en double : ${row.slug}`);
    slugs.add(row.slug);
  }
});

test("chaque district couvre au moins un département connu", () => {
  for (const row of reference) {
    assert.ok(row.departments.length > 0, `${row.name} ne couvre aucun département`);
    for (const code of row.departments) {
      assert.ok(code in DEPARTMENT_NAMES, `${row.name} cite un département inconnu : ${code}`);
    }
  }
});

test("une ligne du registre porte son nom légal, une ligne manuelle ne prétend pas en avoir", () => {
  for (const row of reference) {
    if (row.source === "annuaire") {
      assert.ok(row.legalName, `${row.name} vient du registre mais n'a pas de nom légal`);
    } else {
      assert.equal(row.legalName, null, `${row.name} est saisi à la main mais porte un nom légal`);
      assert.equal(row.siren, null, `${row.name} est saisi à la main mais porte un SIREN`);
    }
  }
});

test("tous les départements sont couverts, sauf ceux qui n'ont pas de district", () => {
  // La Corse et quatre départements d'outre-mer sont administrés directement
  // par leur ligue : leur absence est la réalité, pas un oubli.
  const covered = new Set(reference.flatMap((r) => r.departments));
  const expected = Object.keys(DEPARTMENT_NAMES).filter(
    (code) => !(DEPARTMENTS_WITHOUT_DISTRICT as readonly string[]).includes(code),
  );
  const missing = expected.filter((code) => !covered.has(code));
  assert.deepEqual(missing, [], `départements sans district : ${missing.join(", ")}`);
});

test("aucun département sans district n'a pourtant un district", () => {
  const covered = new Set(reference.flatMap((r) => r.departments));
  for (const code of DEPARTMENTS_WITHOUT_DISTRICT) {
    assert.ok(!covered.has(code), `${code} est déclaré sans district mais en a un`);
  }
});

test("les districts à cheval sur deux départements sont bien ceux qu'on croit", () => {
  // Fige les cinq cas établis sur pièces, en lisant leur nom légal. Un sixième
  // qui apparaîtrait sans qu'on l'ait voulu serait le signe d'une mauvaise
  // manipulation du fichier.
  const multi = reference.filter((r) => r.departments.length > 1).map((r) => r.departments.join("+")).sort();
  assert.deepEqual(multi, ["04+05", "07+26", "25+90", "30+48", "67+68"]);
});
