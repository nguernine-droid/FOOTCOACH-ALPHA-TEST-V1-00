
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import {
  createTeamSchema,
  registerCoachSchema,
  type AuthResponseDto,
  type CoachTeamDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole, signAccessToken } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { issueRefreshToken, toUserDto } from "./auth.js";
import { insertTeamWithCode } from "./club.js";
import { registerRateLimit } from "../lib/rateLimits.js";
import { cityCoords } from "../lib/cities.js";
import { generateCode } from "../lib/codes.js";

async function assertEmailFree(email: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing) throw new HttpError(400, "Un compte existe déjà avec cet email");
}

async function buildAuthResponse(user: typeof users.$inferSelect): Promise<AuthResponseDto> {
  const dto = await toUserDto(user);
  return {
    accessToken: signAccessToken({ id: user.id, role: user.role, teamId: dto.teamId }),
    refreshToken: await issueRefreshToken(user.id),
    user: dto,
  };
}

export function registrationRoutes(app: FastifyInstance) {
  // Inscription coach : crée le compte ET son équipe en une fois. Plafonnée par
  // adresse — sans cela la table des comptes se remplit sans effort.
  app.post("/auth/register-coach", registerRateLimit, async (request, reply): Promise<AuthResponseDto> => {
    const input = registerCoachSchema.parse(request.body);
    await assertEmailFree(input.email);
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          passwordHash,
          role: "coach",
          firstName: input.firstName,
          lastName: input.lastName,
        })
        .returning();
      const coords = cityCoords(input.teamCity);
      const [team] = await tx
        .insert(teams)
        .values({
          name: input.teamName,
          city: input.teamCity,
          coachId: created.id,
          joinCode: generateCode(),
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        })
        .returning();
      // Affectation coach ↔ équipe (source de vérité multi-équipes)
      await tx.insert(teamCoaches).values({ teamId: team.id, coachId: created.id, role: "principal" });
      return created;
    });

    reply.code(201);
    return buildAuthResponse(user);
  });

  // --- Espace coach ---
  //
  // V1 : l'application ne connaît que des coachs. La demande d'affiliation à un
  // club (POST /coach/affiliation) n'est plus exposée — l'espace club, ses
  // routes et ses tables restent en place, simplement hors d'atteinte. Voir
  // l'historique git pour la remettre en service.
  app.register((coach) => {
    coach.addHook("preHandler", requireAuth);
    coach.addHook("preHandler", requireRole("coach"));

    /**
     * Créer une équipe de plus. Un coach en encadre souvent deux (les U13 et
     * les U15) et n'en déclarait qu'une à l'inscription.
     *
     * L'équipe est la sienne, comme à l'inscription : en V1 aucune équipe
     * n'appartient à un club.
     */
    coach.post("/coach/teams", async (request, reply): Promise<CoachTeamDto> => {
      const input = createTeamSchema.parse(request.body);

      const duplicate = await db
        .select({ id: teams.id })
        .from(teams)
        .innerJoin(teamCoaches, eq(teamCoaches.teamId, teams.id))
        .where(and(eq(teamCoaches.coachId, request.user.id), eq(teams.name, input.name)));
      if (duplicate.length > 0) throw new HttpError(400, "Vous encadrez déjà une équipe de ce nom");

      const coords = cityCoords(input.city);
      const team = await insertTeamWithCode({
        name: input.name,
        city: input.city,
        coachId: request.user.id,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      await db.insert(teamCoaches).values({ teamId: team.id, coachId: request.user.id, role: "principal" });

      reply.code(201);
      return { id: team.id, name: team.name, city: team.city, role: "principal" };
    });
  });
}
