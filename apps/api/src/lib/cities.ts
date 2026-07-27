// Annuaire statique ville → coordonnées (pas d'API externe payante).
// Précision "centre-ville" : suffisante pour un tri par proximité sur le radar.

const CITY_COORDS: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  marseille: [43.2965, 5.3698],
  lyon: [45.764, 4.8357],
  toulouse: [43.6047, 1.4442],
  nice: [43.7102, 7.262],
  nantes: [47.2184, -1.5536],
  montpellier: [43.6108, 3.8767],
  strasbourg: [48.5734, 7.7521],
  bordeaux: [44.8378, -0.5792],
  lille: [50.6292, 3.0573],
  rennes: [48.1173, -1.6778],
  reims: [49.2583, 4.0317],
  "saint-etienne": [45.4397, 4.3872],
  toulon: [43.1242, 5.928],
  "le havre": [49.4944, 0.1079],
  grenoble: [45.1885, 5.7245],
  dijon: [47.322, 5.0415],
  angers: [47.4784, -0.5632],
  nimes: [43.8367, 4.3601],
  villeurbanne: [45.7719, 4.8902],
  "clermont-ferrand": [45.7772, 3.087],
  "le mans": [48.0061, 0.1996],
  "aix-en-provence": [43.5297, 5.4474],
  brest: [48.3904, -4.4861],
  tours: [47.3941, 0.6848],
  amiens: [49.8942, 2.2957],
  limoges: [45.8336, 1.2611],
  annecy: [45.8992, 6.1294],
  perpignan: [42.6887, 2.8948],
  besancon: [47.2378, 6.0241],
  metz: [49.1193, 6.1757],
  orleans: [47.9029, 1.9092],
  rouen: [49.4432, 1.0993],
  mulhouse: [47.7508, 7.3359],
  caen: [49.1829, -0.3707],
  nancy: [48.6921, 6.1844],
  bron: [45.7394, 4.9139],
  caluire: [45.7953, 4.8437],
  venissieux: [45.6978, 4.8859],
  "vaulx-en-velin": [45.7768, 4.9203],
  decines: [45.7687, 4.9594],
  meyzieu: [45.7666, 5.0037],
};

function normalizeCity(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

export function cityCoords(name: string): { lat: number; lng: number } | null {
  const hit = CITY_COORDS[normalizeCity(name)];
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
