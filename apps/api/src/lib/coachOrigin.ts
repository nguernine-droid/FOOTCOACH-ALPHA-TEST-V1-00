import { eq } from "drizzle-orm";
import type { CoachLocationDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { teams, users } from "../db/schema.js";

/**
 * D'où rayonne un coach : distances des annonces, centre du radar, et
 * périmètre des alertes push.
 *
 * Ordre de priorité :
 *   1. la position qu'il a réglée lui-même (GPS ou adresse) ;
 *   2. à défaut, la ville de son équipe active — le comportement historique ;
 *   3. sinon rien : ni distance, ni radar, plutôt qu'un chiffre inventé.
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
  if (team?.lat != null && team?.lng != null) {
    return { lat: team.lat, lng: team.lng, label: team.city, source: "team" };
  }
  return null;
}

/** Idem, en chargeant l'utilisateur et son équipe active depuis leurs ids. */
export async function loadOrigin(userId: string, teamId: string | null): Promise<CoachLocationDto | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [team] = teamId ? await db.select().from(teams).where(eq(teams.id, teamId)) : [];
  return originOf(user, team ?? null);
}
