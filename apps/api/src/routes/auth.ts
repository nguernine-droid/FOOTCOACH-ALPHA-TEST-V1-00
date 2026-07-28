import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  forgotPasswordSchema,
  isV1Role,
  updateProfileSchema,
  loginSchema,
  refreshSchema,
  type AuthResponseDto,
  type CoachLocationDto,
  type CoachTeamDto,
  type UserDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import {
  joinRequests,
  loginEvents,
  passwordResetRequests,
  refreshTokens,
  teamCoaches,
  teams,
  users,
} from "../db/schema.js";
import { requireAuth, signAccessToken, type AuthUser } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { generateCode } from "../lib/codes.js";
import { originOf } from "../lib/coachOrigin.js";
import { authRateLimit } from "../lib/rateLimits.js";

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

// Équipes encadrées par un coach (via team_coaches), coach principal en premier
export async function getCoachTeams(coachId: string): Promise<CoachTeamDto[]> {
  const rows = await db
    .select({ id: teams.id, name: teams.name, city: teams.city, role: teamCoaches.role })
    .from(teamCoaches)
    .innerJoin(teams, eq(teamCoaches.teamId, teams.id))
    .where(eq(teamCoaches.coachId, coachId))
    .orderBy(asc(teamCoaches.createdAt));
  // Tri stable : équipe(s) où il est "principal" avant celles où il est "adjoint"
  return rows.sort((a, b) => (a.role === "principal" ? 0 : 1) - (b.role === "principal" ? 0 : 1));
}

/** URL publique d'une photo de profil (servie par l'API, proxifiée sous /api) */
export function avatarUrlOf(avatarPath: string | null): string | null {
  return avatarPath ? `/api/uploads/${avatarPath}` : null;
}

/**
 * Code personnel du coach, généré une seule fois puis figé. La génération est
 * paresseuse : les comptes créés avant les relations en héritent à leur
 * prochaine lecture de profil, sans migration de données.
 */
export async function ensureCoachCode(user: typeof users.$inferSelect): Promise<string | null> {
  if (user.role !== "coach") return null;
  if (user.coachCode) return user.coachCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const [updated] = await db
        .update(users)
        .set({ coachCode: code })
        .where(eq(users.id, user.id))
        .returning({ coachCode: users.coachCode });
      return updated?.coachCode ?? code;
    } catch {
      // Collision sur l'index unique (rarissime) : nouveau tirage
    }
  }
  return null;
}

export async function toUserDto(user: typeof users.$inferSelect): Promise<UserDto> {
  let teamId = user.teamId;
  let teamName: string | null = null;
  let coachTeams: CoachTeamDto[] | undefined;
  let clubName: string | null | undefined;
  let pendingClubName: string | null | undefined;
  let coachCode: string | null | undefined;
  // Position effective du coach : la sienne, ou à défaut la ville de son équipe
  let location: CoachLocationDto | null = null;
  if (user.role === "coach") {
    coachCode = await ensureCoachCode(user);
    coachTeams = await getCoachTeams(user.id);
    teamId = coachTeams[0]?.id ?? null;
    teamName = coachTeams[0]?.name ?? null;
    // Une seule lecture de l'équipe, et seulement si le repli peut servir
    const [primaryTeam] =
      user.lat == null && teamId ? await db.select().from(teams).where(eq(teams.id, teamId)) : [];
    location = originOf(user, primaryTeam ?? null);
    // V1 : l'application ne connaît que des coachs. Plus aucune affiliation
    // n'est possible et le club ne s'affiche nulle part — inutile d'aller le
    // chercher à chaque lecture du compte. Le club reste en base et dans le
    // code : rétablir ces deux lectures suffit à le faire revenir.
    clubName = null;
    pendingClubName = null;
  } else if (teamId) {
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    teamName = team?.name ?? null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    teamId,
    teamName,
    phone: user.phone,
    avatarUrl: avatarUrlOf(user.avatarPath),
    ...(coachTeams ? { teams: coachTeams } : {}),
    ...(user.role === "coach"
      ? {
          coachCode: coachCode ?? null,
          clubName: clubName ?? null,
          pendingClubName: pendingClubName ?? null,
          location,
          radarRadiusKm: user.radarRadiusKm,
          notifications: {
            newAnnouncement: user.notifyNewAnnouncement,
            announcementResponse: user.notifyAnnouncementResponse,
            responseDecision: user.notifyResponseDecision,
            score: user.notifyScore,
          },
        }
      : {}),
  };
}

// teamId "principal" d'un coach = son équipe par défaut (première de team_coaches).
// Gravé dans le JWT ; le header X-Team-Id peut le remplacer par une autre de ses
// équipes à chaque requête (voir requireAuth).
export async function resolveTeamId(user: typeof users.$inferSelect): Promise<string | null> {
  if (user.role === "coach") {
    const coachTeams = await getCoachTeams(user.id);
    return coachTeams[0]?.id ?? null;
  }
  return user.teamId;
}

/** V1 : seuls coach et admin accèdent à l'application */
const V1_ROLE_MESSAGE =
  "Cet espace n'est pas disponible dans la version 1 de FootCoach, réservée aux coachs.";


/**
 * Empreinte bcrypt d'un mot de passe qui n'existe pas. Sert à comparer même
 * quand le compte est inconnu : sans cela, la réponse revient bien plus vite
 * pour un email non inscrit, ce qui suffit à dresser la liste des comptes.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", authRateLimit, async (request): Promise<AuthResponseDto> => {
    const { email, password } = loginSchema.parse(request.body);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) {
      throw new HttpError(401, "Email ou mot de passe incorrect");
    }
    // Après la vérification du mot de passe : ne révèle pas l'existence du compte
    if (user.disabledAt) {
      throw new HttpError(403, "Compte désactivé — contactez l'administrateur");
    }
    if (!isV1Role(user.role)) {
      throw new HttpError(403, V1_ROLE_MESSAGE);
    }
    // Trace de connexion pour les statistiques admin
    await db.insert(loginEvents).values({ userId: user.id, role: user.role });
    const authUser: AuthUser = { id: user.id, role: user.role, teamId: await resolveTeamId(user) };
    return {
      accessToken: signAccessToken(authUser),
      refreshToken: await issueRefreshToken(user.id),
      user: await toUserDto(user),
    };
  });

  app.post("/auth/refresh", authRateLimit, async (request): Promise<AuthResponseDto> => {
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
    if (user.disabledAt) throw new HttpError(403, "Compte désactivé — contactez l'administrateur");
    if (!isV1Role(user.role)) throw new HttpError(403, V1_ROLE_MESSAGE);
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

  // Mot de passe oublié : enregistre une demande visible par l'admin, qui
  // génèrera un mot de passe temporaire. Réponse identique que le compte
  // existe ou non (pas d'énumération d'emails).
  app.post("/auth/forgot-password", authRateLimit, async (request) => {
    const { email } = forgotPasswordSchema.parse(request.body);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (user && !user.disabledAt) {
      await db.insert(passwordResetRequests).values({ userId: user.id }).onConflictDoNothing();
    }
    return { ok: true };
  });

  app.get("/me", { preHandler: requireAuth }, async (request): Promise<UserDto> => {
    const [user] = await db.select().from(users).where(eq(users.id, request.user.id));
    if (!user) throw new HttpError(404, "Utilisateur introuvable");
    return toUserDto(user);
  });

  // Personnalisation du compte : identité et téléphone partagé aux relations
  app.patch("/me/profile", { preHandler: requireAuth }, async (request): Promise<UserDto> => {
    const input = updateProfileSchema.parse(request.body);
    const [updated] = await db
      .update(users)
      .set({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      })
      .where(eq(users.id, request.user.id))
      .returning();
    return toUserDto(updated);
  });
}
