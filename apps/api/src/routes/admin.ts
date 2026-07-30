import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, count, desc, eq, gte, ilike, isNull, max, or } from "drizzle-orm";
import {
  idParamSchema,
  ROLES,
  createClubSchema,
  updateAccountEmailSchema,
  type AdminAccountDto,
  type AdminCreateClubResultDto,
  type AdminStatsDto,
  type Role,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { clubs, loginEvents, passwordResetRequests, refreshTokens, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { generateCode } from "../lib/codes.js";
import { toClubDto } from "./club.js";
import { cityCoords } from "../lib/cities.js";
import { generateTempPassword } from "../lib/passwords.js";
import { revokeAllSessions } from "../lib/sessions.js";

const DAY_MS = 24 * 3600 * 1000;

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("admin"));

  // Un admin ne peut pas agir sur son propre compte ni sur un autre admin
  async function getManageableAccount(id: string, selfId: string) {
    if (id === selfId) throw new HttpError(400, "Vous ne pouvez pas agir sur votre propre compte");
    const [account] = await db.select().from(users).where(eq(users.id, id));
    if (!account) throw new HttpError(404, "Compte introuvable");
    if (account.role === "admin") throw new HttpError(403, "Impossible d'agir sur un compte administrateur");
    return account;
  }

  app.get("/admin/stats", async (request): Promise<AdminStatsDto> => {
    const query = request.query as { date?: string };
    const now = new Date();
    const hourlyDate =
      query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : localDateKey(now);

    const allUsers = await db.select().from(users);
    const [{ value: teamsCount }] = await db.select({ value: count() }).from(teams);
    const [{ value: pendingResets }] = await db
      .select({ value: count() })
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.status, "pending"));

    // Une seule requête sur 30 jours : nourrit actifs 7j/30j et connexions/jour
    const since30d = new Date(now.getTime() - 30 * DAY_MS);
    const events = await db.select().from(loginEvents).where(gte(loginEvents.createdAt, since30d));

    const active30 = new Set<string>();
    const active7 = new Set<string>();
    const perDay = new Map<string, number>();
    const cutoff7 = now.getTime() - 7 * DAY_MS;
    for (const ev of events) {
      active30.add(ev.userId);
      if (ev.createdAt.getTime() >= cutoff7) active7.add(ev.userId);
      const key = localDateKey(ev.createdAt);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    const loginsPerDay = Array.from({ length: 14 }, (_, i) => {
      const date = localDateKey(new Date(now.getTime() - (13 - i) * DAY_MS));
      return { date, count: perDay.get(date) ?? 0 };
    });

    // Connexions heure par heure du jour demandé (bornes locales serveur)
    const [y, m, d] = hourlyDate.split("-").map(Number);
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);
    const dayEvents = await db
      .select()
      .from(loginEvents)
      .where(and(gte(loginEvents.createdAt, dayStart)));
    const perHour = new Array(24).fill(0) as number[];
    for (const ev of dayEvents) {
      if (ev.createdAt >= dayStart && ev.createdAt < dayEnd) perHour[ev.createdAt.getHours()]++;
    }

    const byRole = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
    for (const u of allUsers) byRole[u.role]++;

    return {
      totalAccounts: allUsers.length,
      byRole,
      active7d: active7.size,
      active30d: active30.size,
      teamsCount,
      pendingResets,
      loginsPerDay,
      loginsPerHour: perHour.map((c, hour) => ({ hour, count: c })),
      hourlyDate,
    };
  });

  // Création d'un compte club : le club + son compte de connexion (role=club).
  // Le mot de passe temporaire n'est retourné qu'ici, une seule fois.
  app.post("/admin/clubs", async (request, reply): Promise<AdminCreateClubResultDto> => {
    const input = createClubSchema.parse(request.body);
    const email = input.email.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) throw new HttpError(400, "Un compte existe déjà avec cet email");

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const coords = cityCoords(input.city);

    const club = await db.transaction(async (tx) => {
      const [owner] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          role: "club",
          firstName: input.contactFirstName,
          lastName: input.contactLastName,
        })
        .returning();
      // Code d'affiliation unique (retry en cas de collision)
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const [created] = await tx
            .insert(clubs)
            .values({
              name: input.name,
              city: input.city,
              email,
              ownerId: owner.id,
              affiliationCode: generateCode(),
              lat: coords?.lat ?? null,
              lng: coords?.lng ?? null,
            })
            .returning();
          return created;
        } catch (err) {
          if ((err as { code?: string }).code === "23505" && attempt < 3) continue;
          throw err;
        }
      }
      throw new HttpError(500, "Impossible de générer un code d'affiliation, réessayez");
    });

    reply.code(201);
    return { club: toClubDto(club), ownerEmail: email, tempPassword };
  });

  app.get("/admin/accounts", async (request): Promise<AdminAccountDto[]> => {
    const { q } = request.query as { q?: string };

    const lastLogin = db
      .select({ userId: loginEvents.userId, lastLoginAt: max(loginEvents.createdAt).as("last_login_at") })
      .from(loginEvents)
      .groupBy(loginEvents.userId)
      .as("last_login");

    const term = q?.trim() ? `%${q.trim()}%` : null;
    const rows = await db
      .select({ user: users, teamName: teams.name, lastLoginAt: lastLogin.lastLoginAt })
      .from(users)
      .leftJoin(lastLogin, eq(lastLogin.userId, users.id))
      // Un coach a users.teamId null : son équipe se trouve via teams.coachId
      .leftJoin(teams, or(eq(teams.id, users.teamId), eq(teams.coachId, users.id)))
      .where(
        term
          ? or(ilike(users.email, term), ilike(users.firstName, term), ilike(users.lastName, term))
          : undefined,
      )
      .orderBy(desc(users.createdAt));

    const pending = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.status, "pending"));
    const pendingUserIds = new Set(pending.map((p) => p.userId));

    // Un coach multi-équipes est joint à plusieurs lignes (teams.coachId) : on
    // dédoublonne par compte en gardant la première équipe rencontrée.
    const seen = new Set<string>();
    const accounts: AdminAccountDto[] = [];
    for (const { user, teamName, lastLoginAt } of rows) {
      if (seen.has(user.id)) continue;
      seen.add(user.id);
      accounts.push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        teamName,
        disabled: user.disabledAt != null,
        hasPendingReset: pendingUserIds.has(user.id),
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: lastLoginAt?.toISOString() ?? null,
      });
    }
    return accounts;
  });

  // Réinitialisation manuelle : mot de passe temporaire retourné UNE seule fois
  app.post("/admin/accounts/:id/reset-password", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const account = await getManageableAccount(id, request.user.id);
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, account.id));
      await tx
        .update(passwordResetRequests)
        .set({ status: "handled", handledAt: new Date() })
        .where(and(eq(passwordResetRequests.userId, account.id), eq(passwordResetRequests.status, "pending")));
    });
    await revokeAllSessions(account.id);
    return { tempPassword };
  });

  app.post("/admin/accounts/:id/disable", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const account = await getManageableAccount(id, request.user.id);
    await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, account.id));
    // Sans révocation, la session resterait valable jusqu'à 7 jours (refresh)
    await revokeAllSessions(account.id);
    return { ok: true };
  });

  app.post("/admin/accounts/:id/enable", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const account = await getManageableAccount(id, request.user.id);
    await db.update(users).set({ disabledAt: null }).where(eq(users.id, account.id));
    return { ok: true };
  });

  app.patch("/admin/accounts/:id/email", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = updateAccountEmailSchema.parse(request.body);
    const account = await getManageableAccount(id, request.user.id);
    const email = input.email.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing && existing.id !== account.id) {
      throw new HttpError(400, "Un compte existe déjà avec cet email");
    }
    await db.update(users).set({ email }).where(eq(users.id, account.id));
    return { ok: true };
  });

  // Suppression définitive — réservée aux comptes joueur/parent/supporter :
  // un coach est référencé par son équipe et les événements qu'il a créés.
  app.delete("/admin/accounts/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const account = await getManageableAccount(id, request.user.id);
    if (account.role === "coach") {
      throw new HttpError(400, "Un compte coach ne peut pas être supprimé (il porte son équipe)");
    }
    if (account.role === "club") {
      throw new HttpError(400, "Un compte club ne peut pas être supprimé (il possède des équipes)");
    }
    try {
      await db.transaction(async (tx) => {
        // Les joueurs qui avaient ce parent assigné redeviennent sans parent
        await tx.update(users).set({ parentId: null }).where(eq(users.parentId, account.id));
        await tx.delete(users).where(eq(users.id, account.id));
      });
    } catch (err) {
      // Filet de sécurité : référence non prévue (23503 = violation de FK)
      if ((err as { code?: string }).code === "23503") {
        throw new HttpError(409, "Ce compte est référencé par d'autres données et ne peut pas être supprimé");
      }
      throw err;
    }
    return { ok: true };
  });
}
