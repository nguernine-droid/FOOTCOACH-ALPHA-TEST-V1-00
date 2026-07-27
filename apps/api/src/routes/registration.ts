import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { affiliateClubSchema, registerCoachSchema, type AuthResponseDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { clubAffiliationRequests, clubs, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole, signAccessToken } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { issueRefreshToken, toUserDto } from "./auth.js";
import { cityCoords } from "../lib/cities.js";

// Alphabet sans caractères ambigus (pas de O/0, I/1…) : codes faciles à dicter
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  return Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

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
  });
}
