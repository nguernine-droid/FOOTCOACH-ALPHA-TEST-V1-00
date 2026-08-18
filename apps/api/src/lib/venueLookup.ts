import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { venues } from "../db/schema.js";

/**
 * Le terrain retenu par un coach, s'il en a retenu un.
 *
 * Renvoie le nom ET la position : c'est la position qui compte, puisqu'elle
 * remplace le centre de la commune dans tous les calculs de distance. Un
 * identifiant inconnu ne fait pas échouer la requête — il retombe sur `null`,
 * et l'équipe garde le repli communal. Le coach a saisi un nom de stade, pas
 * une clé étrangère ; lui refuser sa création pour un identifiant périmé serait
 * disproportionné.
 */
export async function venueById(
  id: string | null | undefined,
): Promise<{ name: string; lat: number; lng: number } | null> {
  if (!id) return null;
  const [row] = await db
    .select({ name: venues.name, lat: venues.lat, lng: venues.lng })
    .from(venues)
    .where(eq(venues.id, id));
  return row ?? null;
}
