import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { communeKey } from "./cityAliases.js";

/**
 * Ville → département, l'annuaire jumeau de `communesCoords.json`.
 *
 * Même source (geo.api.gouv.fr), même normalisation de clé, même règle
 * d'arbitrage : sur les ~2 300 noms de commune partagés par plusieurs
 * départements, le premier rencontré l'emporte. Les deux fichiers couvrent donc
 * exactement les mêmes 32 677 villes, et une ville qui a des coordonnées a un
 * département — l'inverse serait la pire des situations, un point sur le radar
 * qu'aucun tableau ne saurait compter.
 *
 * ── Pourquoi le département et non le district ──────────────────────────
 * Un district de football n'est PAS un département : quelques-uns en couvrent
 * deux, et les grandes métropoles ont le leur. Il n'existe pas de découpage
 * officiel réutilisable — la FFF ne le publie pas en données ouvertes, et ses
 * CGU réservent ses bases.
 *
 * Le département est donc une APPROXIMATION assumée, et c'est celle que
 * l'application affiche : « Rhône (69) », jamais « District du Rhône ». Elle
 * suffit à ce qu'on lui demande — mesurer où se concentre la liquidité pour
 * décider où concentrer l'effort — et elle ne prétend pas à une exactitude
 * qu'on ne peut pas garantir.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEPARTMENTS: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "communeDepartments.json"), "utf-8"),
);


/**
 * Le code du département d'une ville, ou `null` si elle est absente de
 * l'annuaire. Jamais de valeur devinée : une ville inconnue est comptée à part
 * plutôt que rattachée au hasard à un département qui gonflerait ses chiffres.
 */
export function departmentOf(city: string | null | undefined): string | null {
  if (!city) return null;
  // `communeKey` plutôt qu'une normalisation locale : les alias de noms
  // abrégés sont partagés avec l'annuaire des coordonnées, et c'est ce qui
  // maintient l'invariant énoncé plus haut.
  return DEPARTMENTS[communeKey(city)] ?? null;
}
