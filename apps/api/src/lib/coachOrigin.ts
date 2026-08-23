import { eq } from "drizzle-orm";
import type { CoachLocationDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { teams, users } from "../db/schema.js";
import { cityCoords } from "./cities.js";

/**
 * D'où rayonne un coach : distances des annonces, centre du radar, et
 * périmètre des alertes push.
 *
 * Ordre de priorité :
 *   1. la position qu'il a réglée lui-même (GPS ou adresse) ;
 *   2. à défaut, la ville de son équipe active — le comportement historique ;
 *   3. sinon rien : ni distance, ni radar, plutôt qu'un chiffre inventé.
 *
 * ── Le point 2 se lit en DEUX temps, et c'est le correctif ───────────────
 * Une équipe porte parfois ses propres coordonnées, parfois seulement le nom
 * de sa commune. Ce code s'arrêtait aux premières : une fiche non géocodée
 * rendait son coach SANS ORIGINE, alors que sa ville figure dans l'annuaire et
 * suffit à le situer.
 *
 * Ce n'est pas un cas de laboratoire. Une commune ajoutée à l'annuaire APRÈS
 * la création d'une équipe (« Valras », reconnue depuis comme alias de
 * Valras-Plage) laisse exactement cette trace : une fiche sans coordonnées,
 * d'une ville pourtant connue. Le coach voyait alors le radar sans aucune
 * distance, ne recevait plus d'alerte de publication, et surtout ne comptait
 * aucun confrère cherchant le même jour — `withinRadius` refusant, à raison,
 * de mettre en relation sans savoir où l'on est.
 *
 * Le repli sur l'annuaire est celui que fait déjà `teamCoords`
 * (`availabilityMatch.ts`), dont le commentaire annonce « le même repli que le
 * radar » : c'est cette promesse-là qui n'était pas tenue ici.
 */
export function originOf(
  user: Pick<typeof users.$inferSelect, "lat" | "lng" | "locationLabel" | "locationSource">,
  team: Pick<typeof teams.$inferSelect, "city" | "lat" | "lng"> | null,
): CoachLocationDto | null {
  if (user.lat != null && user.lng != null) {
    return {
      lat: user.lat,
      lng: user.lng,
      label: user.locationLabel ?? "Position enregistrée",
      source: user.locationSource ?? "address",
    };
  }
  if (!team) return null;
  if (team.lat != null && team.lng != null) {
    return { lat: team.lat, lng: team.lng, label: team.city, source: "team" };
  }
  // `source: "team"` dans les deux cas : du point de vue du coach, c'est la
  // même chose — il n'a pas réglé de position, on se sert de son équipe. La
  // précision (fiche ou annuaire) ne change rien à ce qu'il doit en penser.
  const fromCity = cityCoords(team.city);
  return fromCity ? { lat: fromCity.lat, lng: fromCity.lng, label: team.city, source: "team" } : null;
}

/** Idem, en chargeant l'utilisateur et son équipe active depuis leurs ids. */
export async function loadOrigin(userId: string, teamId: string | null): Promise<CoachLocationDto | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [team] = teamId ? await db.select().from(teams).where(eq(teams.id, teamId)) : [];
  return originOf(user, team ?? null);
}
