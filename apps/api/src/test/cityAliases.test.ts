import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { cityCoords } from "../lib/cities.js";
import { departmentOf } from "../lib/districts.js";

/**
 * L'invariant des deux annuaires : une commune connue de l'un est connue de
 * l'autre.
 *
 * ── Ce que ce test protège ──────────────────────────────────────────────
 * `communesCoords.json` place une ville sur le radar, `communeDepartments.json`
 * la range dans un département. Ils viennent de la même source et couvrent les
 * mêmes communes — sauf si un alias vient s'ajouter d'un seul côté.
 *
 * C'est arrivé : « Valras » (pour Valras-Plage) a d'abord été ajouté aux
 * seules coordonnées. L'annonce s'affichait donc sur le radar, mais restait
 * introuvable dans les pages publiques par département et absente des
 * comptages — un point sur la carte qu'aucun tableau ne savait compter, ce
 * que le commentaire de `districts.ts` annonçait justement comme le pire cas.
 *
 * Depuis, les alias renvoient vers le nom officiel et sont traversés par les
 * deux annuaires. Ce test vérifie que ça reste vrai : il échouera au premier
 * alias qui ne résoudrait que d'un côté.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const aliasSource = readFileSync(path.join(__dirname, "../lib/cityAliases.ts"), "utf-8");

/** Les alias déclarés, lus dans la source : le test suit la table sans qu'on ait à la recopier. */
function declaredAliases(): string[] {
  const table = aliasSource.match(/CITY_ALIASES: Record<string, string> = \{([^}]*)\}/s);
  assert.ok(table, "table CITY_ALIASES introuvable — le test doit suivre sa forme");
  return [...table[1].matchAll(/^\s*([a-z0-9-]+)\s*:/gm)].map((m) => m[1]);
}

test("chaque alias de commune existe dans les DEUX annuaires", () => {
  const aliases = declaredAliases();
  assert.ok(aliases.length > 0, "aucun alias lu : le test ne vérifierait rien");

  for (const alias of aliases) {
    assert.notEqual(cityCoords(alias), null, `« ${alias} » n'a pas de coordonnées`);
    assert.notEqual(departmentOf(alias), null, `« ${alias} » n'a pas de département`);
  }
});

test("un alias désigne bien la même commune que son nom officiel", () => {
  // Le cas qui a motivé tout ceci : les deux formes doivent être
  // interchangeables, pas seulement connues chacune de son côté.
  assert.deepEqual(cityCoords("Valras"), cityCoords("Valras-Plage"));
  assert.equal(departmentOf("Valras"), departmentOf("Valras-Plage"));
  assert.equal(departmentOf("Valras"), "34");
});

test("une commune inconnue reste inconnue des deux côtés", () => {
  // Rien n'est deviné : un nom absent ne doit pas être rattaché au hasard.
  assert.equal(cityCoords("Ville-Qui-N-Existe-Pas"), null);
  assert.equal(departmentOf("Ville-Qui-N-Existe-Pas"), null);
});
