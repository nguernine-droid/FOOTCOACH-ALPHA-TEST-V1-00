import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { communeKey } from "./cityAliases.js";

// Annuaire ville → coordonnées, chargé depuis `communesCoords.json` : les ~32 700
// communes de France (source geo.api.gouv.fr, base officielle), chacune à son
// centre. Une quarantaine de villes ne se trouvaient plus dans le petit
// annuaire fait main d'avant (46 grandes villes) — Alès, Sète, Frontignan et
// toutes les autres communes moyennes en étaient absentes, ce qui les rendait
// invisibles sur le disque du radar (aucune coordonnée = aucun marqueur,
// silencieusement).
//
// En cas d'homonymie (~2 300 noms de commune partagés par plusieurs départements),
// la première rencontrée l'emporte : la ville seule ne lève de toute façon pas
// l'ambiguïté sans le département.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMUNES: Record<string, [number, number]> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "communesCoords.json"), "utf-8"),
);

// Les noms abrégés (« Caluire » pour Caluire-et-Cuire, « Valras » pour
// Valras-Plage) passent par `communeKey`, partagé avec l'annuaire des
// départements. Ils y renvoient vers le nom OFFICIEL plutôt que de porter leurs
// propres coordonnées : une commune connue d'un seul des deux annuaires est
// précisément ce que l'invariant de `districts.ts` interdit.
export function cityCoords(name: string): { lat: number; lng: number } | null {
  const hit = COMMUNES[communeKey(name)];
  return hit ? { lat: hit[0], lng: hit[1] } : null;
}

/**
 * Relèvement initial de `a` vers `b`, en degrés entiers : 0 = nord, sens des
 * aiguilles d'une montre. Sert à placer les points sur le radar dans leur
 * vraie direction plutôt qu'au hasard.
 */
export function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLng = rad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLng);
  // Le modulo final ramène un arrondi à 360 sur 0
  return Math.round((((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360) % 360;
}

/** Distance à vol d'oiseau en km (haversine), arrondie à une décimale. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
