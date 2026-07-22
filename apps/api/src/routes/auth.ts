import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, desc, eq, isNull } from "drizzle-orm";
import { driverInfoSchema, loginSchema, refreshSchema, type AuthResponseDto, type UserDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { joinRequests, refreshTokens, teams, users } from "../db/schema.js";
import { requireAuth, signAccessToken, type AuthUser } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

const REFRESH_TTL_MS = 7 * 24 * 3600 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("base64url");
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return token;
}

export async function toUserDto(user: typeof users.$inferSelect): Promise<UserDto> {
  let teamId = user.teamId;
  let teamName: string | null = null;
  if (user.role === "coach") {
    const [team] = await db.select().from(teams).where(eq(teams.coachId, user.id));
    teamId = team?.id ?? null;
    teamName = team?.name ?? null;
  } else if (teamId) {
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    teamName = team?.name ?? null;
  }

  // Joueur/parent sans équipe : exposer l'état de sa dernière demande d'adhésion
  // (alimente l'écran "demande en attente de validation")
  let joinRequestStatus: UserDto["joinRequestStatus"] = null;
  let pendingTeamName: string | null = null;
  if (!teamId && (user.role === "player" || user.role === "parent")) {
    const [latest] = await db
      .select({ request: joinRequests, team: teams })
      .from(joinRequests)
      .innerJoin(teams, eq(joinRequests.teamId, teams.id))
      .where(eq(joinRequests.userId, user.id))
      .orderBy(desc(joinRequests.createdAt))
      .limit(1);
    if (latest) {
      joinRequestStatus = latest.request.status;
      pendingTeamName = latest.team.name;
    }
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    teamId,
    teamName,
    hasDriverInfo: Boolean(user.licensePlate && user.driverLicenseNumber),
    parentId: user.parentId,
    position: user.position,
    jerseyNumber: user.jerseyNumber,
    joinRequestStatus,
    pendingTeamName,
  };
}

// Le teamId d'un coach est l'équipe qu'il dirige (users.team_id est null pour lui)
export async function resolveTeamId(user: typeof users.$inferSelect): Promise<string | null> {
  if (user.role === "coach") {
    const [team] = await db.select().from(teams).where(eq(teams.coachId, user.id));
    return team?.id ?? null;
  }
  return user.teamId;
}

export function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request): Promise<AuthResponseDto> => {
    const { email, password } = loginSchema.parse(request.body);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "Email ou mot de passe incorrect");
    }
    const authUser: AuthUser = { id: user.id, role: user.role, teamId: await resolveTeamId(user) };
    return {
      accessToken: signAccessToken(authUser),
      refreshToken: await issueRefreshToken(user.id),
      user: await toUserDto(user),
    };
  });

  app.post("/auth/refresh", async (request): Promise<AuthResponseDto> => {
    const { refreshToken } = refreshSchema.parse(request.body);
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, hashToken(refreshToken)), isNull(refreshTokens.revokedAt)));
    if (!stored || stored.expiresAt < new Date()) {
      throw new HttpError(401, "Session expirée, reconnectez-vous");
    }
    // Rotation : l'ancien token est révoqué, un nouveau est émis
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
    const [user] = await db.select().from(users).where(eq(users.id, stored.userId));
    if (!user) throw new HttpError(401, "Utilisateur introuvable");
    const authUser: AuthUser = { id: user.id, role: user.role, teamId: await resolveTeamId(user) };
    return {
      accessToken: signAccessToken(authUser),
      refreshToken: await issueRefreshToken(user.id),
      user: await toUserDto(user),
    };
  });

  app.post("/auth/logout", async (request) => {
    const body = refreshSchema.safeParse(request.body);
    if (body.success) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, hashToken(body.data.refreshToken)));
    }
    return { ok: true };
  });

  app.get("/me", { preHandler: requireAuth }, async (request): Promise<UserDto> => {
    const [user] = await db.select().from(users).where(eq(users.id, request.user.id));
    if (!user) throw new HttpError(404, "Utilisateur introuvable");
    return toUserDto(user);
  });

  // Infos conducteur (parent) — prérequis pour proposer un covoiturage
  app.patch("/me/driver-info", { preHandler: requireAuth }, async (request): Promise<UserDto> => {
    if (request.user.role !== "parent") throw new HttpError(403, "Réservé aux comptes parents");
    const input = driverInfoSchema.parse(request.body);
    const [updated] = await db
      .update(users)
      .set({
        licensePlate: input.licensePlate.toUpperCase().trim(),
        driverLicenseNumber: input.driverLicenseNumber.toUpperCase().trim(),
      })
      .where(eq(users.id, request.user.id))
      .returning();
    return toUserDto(updated);
  });
}
