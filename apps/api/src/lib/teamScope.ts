import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { teamCoaches } from "../db/schema.js";

/**
 * Les équipes qui partagent au moins un encadrant avec celle-ci, elle comprise.
 *
 * Un coach en encadre parfois deux, et un adjoint peut l'être ailleurs : ces
 * équipes-là ne peuvent pas se rencontrer, faute de quoi le même homme se
 * retrouverait sur les deux bancs. La règle porte sur les ÉQUIPES et non sur
 * celui qui agit — sinon un second coach de l'équipe suffirait à la contourner.
 */
export async function teamsSharingCoachWith(teamId: string): Promise<string[]> {
  const staff = await db
    .select({ coachId: teamCoaches.coachId })
    .from(teamCoaches)
    .where(eq(teamCoaches.teamId, teamId));
  if (staff.length === 0) return [teamId];
  const rows = await db
    .select({ teamId: teamCoaches.teamId })
    .from(teamCoaches)
    .where(
      inArray(
        teamCoaches.coachId,
        staff.map((s) => s.coachId),
      ),
    );
  return [...new Set([teamId, ...rows.map((r) => r.teamId)])];
}
