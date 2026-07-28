
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import {
  affiliateClubSchema,
  createTeamSchema,
  registerCoachSchema,
  type AuthResponseDto,
  type CoachTeamDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { clubAffiliationRequests, clubs, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole, signAccessToken } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { issueRefreshToken, toUserDto } from "./auth.js";
import { insertTeamWithCode } from "./club.js";
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
  // Inscription coach : crée le compte ET son équipe en une fois
  app.post("/auth/register-coach", async (request, reply): Promise<AuthResponseDto> => {
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

  // --- Espace coach : affiliation à un club ---
  app.register((coach) => {
    coach.addHook("preHandler", requireAuth);
    coach.addHook("preHandler", requireRole("coach"));

    // Demande d'affiliation à un club via son code (le club valide ensuite)
    coach.post("/coach/affiliation", async (request, reply) => {
      const input = affiliateClubSchema.parse(request.body);
      const [club] = await db.select().from(clubs).where(eq(clubs.affiliationCode, input.code.toUpperCase().trim()));
      if (!club) throw new HttpError(404, "Code d'affiliation invalide");

      const [me] = await db.select().from(users).where(eq(users.id, request.user.id));
      if (me?.clubId === club.id) throw new HttpError(400, "Vous êtes déjà affilié à ce club");

      const [pending] = await db
        .select()
        .from(clubAffiliationRequests)
        .where(
          and(eq(clubAffiliationRequests.coachId, request.user.id), eq(clubAffiliationRequests.status, "pending")),
        );
      if (pending) throw new HttpError(400, "Vous avez déjà une demande d'affiliation en attente");

      await db.insert(clubAffiliationRequests).values({ coachId: request.user.id, clubId: club.id });
      reply.code(201);
      return { ok: true, clubName: club.name };
    });

    /**
     * Créer une équipe de plus. Un coach en encadre souvent deux (les U13 et
     * les U15) et n'en déclarait qu'une à l'inscription : il n'avait ensuite
     * aucun moyen d'ajouter la seconde sans passer par un club.
     *
     * L'équipe rejoint le club du coach s'il est affilié — c'est le club qui
     * possède les équipes — sinon elle reste la sienne, comme à l'inscription.
     */
    coach.post("/coach/teams", async (request, reply): Promise<CoachTeamDto> => {
      const input = createTeamSchema.parse(request.body);
      const [me] = await db.select().from(users).where(eq(users.id, request.user.id));

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
        clubId: me?.clubId ?? null,
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
