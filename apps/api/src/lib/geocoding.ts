import type { GeoSuggestionDto } from "@teamnexus/shared";
import { coarseCoord } from "@teamnexus/shared";

/**
 * Géocodage via l'API Adresse de l'État (Base Adresse Nationale) : gratuite,
 * sans clé, couverture France entière.
 *
 * L'appel part du serveur, jamais du navigateur : le front n'a donc aucun
 * domaine tiers à autoriser, et une éventuelle limitation de débit se traite
 * en un seul endroit.
 */
const BAN_BASE = "https://api-adresse.data.gouv.fr";
const TIMEOUT_MS = 4000;

/** Une réponse BAN : GeoJSON dont chaque feature porte label, ville, code postal */
interface BanFeature {
  properties?: { label?: string; city?: string; postcode?: string; name?: string };
  geometry?: { coordinates?: [number, number] };
}

function toSuggestion(feature: BanFeature): GeoSuggestionDto | null {
  const coords = feature.geometry?.coordinates;
  const label = feature.properties?.label;
  if (!coords || coords.length < 2 || !label) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    label,
    city: feature.properties?.city ?? label,
    postcode: feature.properties?.postcode ?? null,
    // Arrondi dès la source : aucune coordonnée fine ne circule ni n'est stockée
    lat: coarseCoord(lat),
    lng: coarseCoord(lng),
  };
}

/** Appel BAN borné dans le temps ; toute panne se traduit par une liste vide. */
async function banRequest(path: string): Promise<GeoSuggestionDto[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BAN_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { features?: BanFeature[] };
    return (body.features ?? []).map(toSuggestion).filter((s): s is GeoSuggestionDto => s !== null);
  } catch {
    // Réseau coupé, délai dépassé, réponse illisible : le champ reste utilisable,
    // simplement sans suggestion. La géolocalisation, elle, continue de marcher.
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Suggestions d'adresses ou de communes pour une saisie partielle */
export async function searchAddresses(query: string, limit = 6): Promise<GeoSuggestionDto[]> {
  const q = query.trim();
  // La BAN rejette les requêtes trop courtes ; inutile de la solliciter
  if (q.length < 3) return [];
  return banRequest(`/search/?q=${encodeURIComponent(q)}&limit=${limit}&autocomplete=1`);
}

/** Libellé de la position renvoyée par le navigateur (« Bron, Rhône ») */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoSuggestionDto | null> {
  const [first] = await banRequest(`/reverse/?lat=${lat}&lon=${lng}&limit=1`);
  return first ?? null;
}
