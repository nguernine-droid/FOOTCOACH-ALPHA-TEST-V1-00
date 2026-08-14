import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { and, count, desc, eq, gte, ilike, inArray, isNull, max, ne, or, sql } from "drizzle-orm";
import {
  idParamSchema,
  ROLES,
  adminUpdateClubSchema,
  createClubSchema,
  mergeClubSchema,
  resetDatabaseSchema,
  updateAccountEmailSchema,
  type AdminAccountDto,
  type AdminResetResultDto,
  type AdminClubDto,
  type AdminClubDuplicateGroupDto,
  type AdminCreateClubResultDto,
  type AdminStatsDto,
  type Role,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import {
  announcementResponses,
  attendances,
  carpoolBookings,
  clubAffiliationRequests,
  clubs,
  coachFeedback,
  coachPoints,
  coachRelations,
  conversationReads,
  conversations,
  eventAttendances,
  joinRequests,
  lineups,
  loginAttempts,
  loginEvents,
  matchAnnouncements,
  matchEvents,
  matches,
  messages,
  passwordResetRequests,
  publications,
  pushSubscriptions,
  refreshTokens,
  teamCoaches,
  teamEvents,
  teams,
  tournamentRegistrations,
  tournaments,
  users,
} from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { generateCode } from "../lib/codes.js";
import { toClubDto } from "./club.js";
import { cityCoords } from "../lib/cities.js";
import { generateTempPassword } from "../lib/passwords.js";
import { clubById } from "../lib/declaredClubs.js";
import { groupLookAlikeClubs } from "../lib/clubMatching.js";
import { revokeAllSessions } from "../lib/sessions.js";
import { hashPassword } from "../lib/passwordHash.js";
import { UPLOADS_DIR } from "../lib/uploads.js";

const DAY_MS = 24 * 3600 * 1000;

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Les clubs de la base, avec ce qui s'y accroche.
 *
 * Trois comptages agrégés plutôt qu'une jointure unique : compter des équipes
 * et des coachs dans la même requête multiplierait les lignes entre elles et
 * gonflerait les deux totaux. Ce sont précisément ces nombres qui disent à
 * l'admin quel club garder d'un doublon — ils doivent être justes.
 */
async function listAdminClubs(): Promise<AdminClubDto[]> {
  const rows = await db
    .select({ club: clubs, ownerEmail: users.email })
    .from(clubs)
    .leftJoin(users, eq(users.id, clubs.ownerId))
    .orderBy(clubs.city, clubs.name);

  const countsById = (entries: { clubId: string | null; value: number }[]) =>
    new Map(entries.filter((e) => e.clubId).map((e) => [e.clubId as string, e.value]));

  const teamCounts = countsById(
    await db.select({ clubId: teams.clubId, value: count() }).from(teams).groupBy(teams.clubId),
  );
  // Les coachs affiliés seulement : le compte de connexion du club (role="club")
  // n'est pas un encadrant, le compter ferait croire à une équipe technique.
  const coachCounts = countsById(
    await db
      .select({ clubId: users.clubId, value: count() })
      .from(users)
      .where(eq(users.role, "coach"))
      .groupBy(users.clubId),
  );
  const requestCounts = countsById(
    await db
      .select({ clubId: clubAffiliationRequests.clubId, value: count() })
      .from(clubAffiliationRequests)
      .where(eq(clubAffiliationRequests.status, "pending"))
      .groupBy(clubAffiliationRequests.clubId),
  );

  return rows.map(({ club, ownerEmail }) => ({
    id: club.id,
    name: club.name,
    city: club.city,
    stadium: club.stadium,
    hasAccount: club.ownerId != null,
    ownerEmail,
    teamsCount: teamCounts.get(club.id) ?? 0,
    coachesCount: coachCounts.get(club.id) ?? 0,
    pendingRequests: requestCounts.get(club.id) ?? 0,
    createdAt: club.createdAt.toISOString(),
  }));
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

    // Créés vs joués : un match « créé » est toute ligne de la table, « joué »
    // celle dont le score est arrivé à son terme (status="finished"). Un
    // tournoi n'a pas d'état « terminé » en base — seulement open/cancelled —
    // donc « joué » se déduit de sa date : son dernier jour est passé, et il
    // n'a pas été annulé.
    const [{ value: matchesTotal }] = await db.select({ value: count() }).from(matches);
    const [{ value: matchesPlayed }] = await db
      .select({ value: count() })
      .from(matches)
      .where(eq(matches.status, "finished"));
    const [{ value: tournamentsTotal }] = await db.select({ value: count() }).from(tournaments);
    const [{ value: tournamentsPlayed }] = await db
      .select({ value: count() })
      .from(tournaments)
      .where(
        and(
          ne(tournaments.status, "cancelled"),
          sql`coalesce(${tournaments.endDate}, ${tournaments.date}) < ${localDateKey(now)}`,
        ),
      );

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
      matchesTotal,
      matchesPlayed,
      tournamentsTotal,
      tournamentsPlayed,
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
    const passwordHash = await hashPassword(tempPassword);
    const coords = cityCoords(input.city);

    /**
     * Club DÉJÀ déclaré que ce compte vient reprendre. Le vérifier avant la
     * transaction : rattacher un compte à un club inexistant créerait un compte
     * orphelin, et il vaut mieux le refuser tout de suite.
     */
    const claimed = input.claimClubId ? await clubById(input.claimClubId) : null;
    if (input.claimClubId && !claimed) throw new HttpError(404, "Club à reprendre introuvable");
    if (claimed?.ownerId) throw new HttpError(400, "Ce club a déjà un compte de connexion");

    const club = await db.transaction(async (tx) => {
      const [owner] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          role: "club",
          // Un compte club n'a pas de surnom à choisir : le prénom du contact
          // tient ce rôle, l'identité affichée reste celle du club.
          nickname: input.contactFirstName,
          firstName: input.contactFirstName,
          lastName: input.contactLastName,
        })
        .returning();
      // Code d'affiliation unique (retry en cas de collision)
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          // Reprise d'un club déclaré : on lui pose son compte et son code sans
          // rien créer de neuf. Les équipes déjà rattachées le restent — c'est
          // tout l'intérêt de la question de doublon posée à la saisie.
          if (claimed) {
            const [updated] = await tx
              .update(clubs)
              .set({
                name: input.name,
                city: input.city,
                stadium: input.stadium?.trim() || claimed.stadium,
                email,
                ownerId: owner.id,
                affiliationCode: generateCode(),
                lat: coords?.lat ?? claimed.lat,
                lng: coords?.lng ?? claimed.lng,
              })
              .where(eq(clubs.id, claimed.id))
              .returning();
            return updated;
          }
          const [created] = await tx
            .insert(clubs)
            .values({
              name: input.name,
              city: input.city,
              stadium: input.stadium?.trim() || null,
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

  // ————— Gestion des clubs déclarés —————

  app.get("/admin/clubs", async (request): Promise<AdminClubDto[]> => {
    const { q } = request.query as { q?: string };
    const all = await listAdminClubs();
    const term = q?.trim().toLowerCase();
    if (!term) return all;
    return all.filter((c) => `${c.name} ${c.city} ${c.stadium ?? ""}`.toLowerCase().includes(term));
  });

  /**
   * Les clubs qui n'en sont probablement qu'un. Déclaré statiquement AVANT
   * `/admin/clubs/:id` n'est pas nécessaire avec le routeur de Fastify (une
   * route littérale l'emporte toujours sur un paramètre), mais l'ordre de
   * lecture aide.
   */
  app.get("/admin/clubs/duplicates", async (): Promise<AdminClubDuplicateGroupDto[]> => {
    const all = await listAdminClubs();
    return groupLookAlikeClubs(all).map((group) => ({
      // Le plus fourni en tête : c'est presque toujours celui à garder, et le
      // proposer d'abord évite la fusion faite à l'envers.
      clubs: [...group].sort(
        (a, b) =>
          b.teamsCount + b.coachesCount - (a.teamsCount + a.coachesCount) ||
          Number(b.hasAccount) - Number(a.hasAccount) ||
          a.createdAt.localeCompare(b.createdAt),
      ),
    }));
  });

  // Correction d'écriture : le nom mal orthographié, la ville, le stade
  app.patch("/admin/clubs/:id", async (request): Promise<AdminClubDto> => {
    const { id } = idParamSchema.parse(request.params);
    const input = adminUpdateClubSchema.parse(request.body);
    const club = await clubById(id);
    if (!club) throw new HttpError(404, "Club introuvable");

    const city = input.city ?? club.city;
    // Ville changée : ses coordonnées suivent, sinon le club resterait posé sur
    // l'ancienne commune du radar. Ville inconnue de l'annuaire = pas de point
    // sur la carte, ce qui vaut mieux qu'un point faux.
    const moved = input.city != null && input.city !== club.city;
    const coords = moved ? cityCoords(city) : null;

    const [updated] = await db
      .update(clubs)
      .set({
        name: input.name ?? club.name,
        city,
        stadium: input.stadium === undefined ? club.stadium : input.stadium || null,
        ...(moved ? { lat: coords?.lat ?? null, lng: coords?.lng ?? null } : {}),
      })
      .where(eq(clubs.id, club.id))
      .returning();

    const all = await listAdminClubs();
    return all.find((c) => c.id === updated.id)!;
  });

  /**
   * Fusion de deux écritures du même club : `sourceId` disparaît, le club de
   * l'URL est celui qu'on garde.
   *
   * Tout ce qui pointait vers le club absorbé est repointé AVANT sa suppression,
   * dans la même transaction — équipes, coachs affiliés, demandes d'affiliation.
   * Sans cela, la contrainte de clé étrangère refuserait la suppression, et
   * c'est très bien ainsi : aucune équipe ne doit se retrouver sans club au
   * motif qu'on a corrigé une orthographe.
   *
   * Un club qui a un COMPTE de connexion ne peut pas être absorbé : son compte
   * et son code d'affiliation disparaîtraient avec lui. L'admin fusionne alors
   * dans l'autre sens.
   */
  app.post("/admin/clubs/:id/merge", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { sourceId } = mergeClubSchema.parse(request.body);
    if (id === sourceId) throw new HttpError(400, "Un club ne peut pas être fusionné avec lui-même");

    const target = await clubById(id);
    if (!target) throw new HttpError(404, "Club à garder introuvable");
    const source = await clubById(sourceId);
    if (!source) throw new HttpError(404, "Club à fusionner introuvable");
    if (source.ownerId) {
      throw new HttpError(
        400,
        "Ce club a un compte de connexion : gardez-le, et fusionnez l'autre dedans",
      );
    }

    await db.transaction(async (tx) => {
      await tx.update(teams).set({ clubId: target.id }).where(eq(teams.clubId, source.id));
      await tx.update(users).set({ clubId: target.id }).where(eq(users.clubId, source.id));
      /**
       * Les demandes en attente suivent aussi : un coach qui attend une réponse
       * du club absorbé doit la recevoir du club gardé, pas voir sa demande
       * s'évaporer. L'unicité « une seule demande en attente par coach » n'est
       * pas menacée — elle porte sur le coach, pas sur le couple coach/club.
       */
      await tx
        .update(clubAffiliationRequests)
        .set({ clubId: target.id })
        .where(eq(clubAffiliationRequests.clubId, source.id));
      await tx.delete(clubs).where(eq(clubs.id, source.id));
    });

    const all = await listAdminClubs();
    return all.find((c) => c.id === target.id)!;
  });

  /**
   * Suppression d'un club vide — une saisie de test, un nom créé par erreur et
   * que personne n'a rejoint. Dès qu'une équipe, un coach ou un compte s'y
   * accroche, c'est une fusion qu'il faut, pas une suppression : elle dirait où
   * vont les rattachements au lieu de les faire disparaître.
   */
  app.delete("/admin/clubs/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const club = await clubById(id);
    if (!club) throw new HttpError(404, "Club introuvable");
    if (club.ownerId) throw new HttpError(400, "Ce club a un compte de connexion");

    const [{ value: teamsCount }] = await db
      .select({ value: count() })
      .from(teams)
      .where(eq(teams.clubId, club.id));
    const [{ value: coachesCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.clubId, club.id));
    if (teamsCount > 0 || coachesCount > 0) {
      throw new HttpError(400, "Ce club a des équipes ou des coachs : fusionnez-le plutôt");
    }

    await db.delete(clubs).where(eq(clubs.id, club.id));
    return { ok: true };
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
          ? or(
              ilike(users.email, term),
              ilike(users.nickname, term),
              ilike(users.firstName, term),
              ilike(users.lastName, term),
            )
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
        nickname: user.nickname,
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
    const passwordHash = await hashPassword(tempPassword);
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

  /**
   * Remise à zéro de la base — le geste de l'ouverture réelle : tout ce que
   * l'alpha a laissé derrière elle disparaît, seuls les comptes administrateurs
   * restent.
   *
   * IRRÉVERSIBLE et sans filet applicatif : la seule reprise possible est la
   * sauvegarde `pg_dump` prise avant. Trois barrières, donc — le rôle admin, la
   * phrase exacte à retaper, et le compte rendu qui dit ce qui est parti.
   *
   * Les suppressions sont explicites, table par table, des filles vers les
   * mères, plutôt qu'un TRUNCATE : `users` est le seul cas partiel de toute
   * l'opération, et un `TRUNCATE … CASCADE` sur `teams` ou `clubs` — que
   * `users` référence — emporterait justement les administrateurs qu'on veut
   * garder. Une liste longue mais lisible vaut mieux qu'une commande brève dont
   * l'effet dépasse ce qu'elle nomme.
   */
  app.post("/admin/reset", async (request): Promise<AdminResetResultDto> => {
    resetDatabaseSchema.parse(request.body);

    // Compté AVANT : après, il n'y a plus rien à compter.
    const [{ value: accounts }] = await db
      .select({ value: count() })
      .from(users)
      .where(ne(users.role, "admin"));
    const [{ value: teamsCount }] = await db.select({ value: count() }).from(teams);
    const [{ value: clubsCount }] = await db.select({ value: count() }).from(clubs);
    const [{ value: announcementsCount }] = await db.select({ value: count() }).from(matchAnnouncements);
    const [{ value: matchesCount }] = await db.select({ value: count() }).from(matches);
    const [{ value: tournamentsCount }] = await db.select({ value: count() }).from(tournaments);
    const [{ value: messagesCount }] = await db.select({ value: count() }).from(messages);

    request.log.warn(
      { adminId: request.user.id, accounts, teams: teamsCount, clubs: clubsCount },
      "Remise à zéro de la base demandée",
    );

    await db.transaction(async (tx) => {
      /**
       * Les liens que les COMPTES portent, d'abord : `users.team_id` et
       * `users.club_id` n'ont pas de suppression en cascade, et un
       * administrateur qui aurait été rattaché à une équipe empêcherait sa
       * suppression. `parent_id` tombe pour la même raison.
       */
      await tx.update(users).set({ teamId: null, clubId: null, parentId: null });

      // Messagerie (les signalements pointent vers un fil : ils partent avant)
      await tx.delete(coachFeedback);
      await tx.delete(conversationReads);
      await tx.delete(messages);
      await tx.delete(conversations);

      // Vie des équipes
      await tx.delete(eventAttendances);
      await tx.delete(teamEvents);
      await tx.delete(lineups);
      await tx.delete(carpoolBookings);
      await tx.delete(matchEvents);
      await tx.delete(attendances);

      // Points, tournois, matchs, annonces
      await tx.delete(coachPoints);
      await tx.delete(tournamentRegistrations);
      await tx.delete(tournaments);
      await tx.delete(matches);
      await tx.delete(announcementResponses);
      await tx.delete(matchAnnouncements);

      // Appartenances, puis les équipes et les clubs eux-mêmes
      await tx.delete(joinRequests);
      await tx.delete(teamCoaches);
      await tx.delete(clubAffiliationRequests);
      await tx.delete(teams);
      await tx.delete(clubs);

      // Réseau, publications, journal de connexion
      await tx.delete(coachRelations);
      await tx.delete(publications);
      await tx.delete(pushSubscriptions);
      await tx.delete(passwordResetRequests);
      await tx.delete(loginEvents);
      await tx.delete(loginAttempts);
      /**
       * Les sessions des ADMINISTRATEURS survivent : celui qui vient de lancer
       * l'opération serait déconnecté avant même d'en lire le compte rendu.
       * Celles de tous les autres partent avec leur compte.
       */
      await tx
        .delete(refreshTokens)
        .where(
          inArray(
            refreshTokens.userId,
            tx.select({ id: users.id }).from(users).where(ne(users.role, "admin")),
          ),
        );

      await tx.delete(users).where(ne(users.role, "admin"));
    });

    /**
     * Les fichiers ensuite, jamais avant : la base est la référence, et des
     * images effacées sur une transaction qui échoue laisseraient des avatars
     * cassés sur des comptes bien vivants. L'inverse — un fichier oublié sans
     * ligne qui le désigne — ne se voit nulle part.
     */
    let files = 0;
    try {
      const entries = await readdir(UPLOADS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        await unlink(path.join(UPLOADS_DIR, entry.name));
        files++;
      }
    } catch (err) {
      // Volume absent ou en lecture seule : la base est déjà remise à zéro, et
      // c'est elle qui compte. On le dit dans le journal, sans faire échouer.
      request.log.error({ err }, "Remise à zéro : purge des fichiers envoyés impossible");
    }

    return {
      accounts,
      teams: teamsCount,
      clubs: clubsCount,
      announcements: announcementsCount,
      matches: matchesCount,
      tournaments: tournamentsCount,
      messages: messagesCount,
      files,
    };
  });
}
