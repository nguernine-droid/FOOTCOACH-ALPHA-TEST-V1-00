import type { FastifyInstance } from "fastify";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, max, ne, or, sql } from "drizzle-orm";
import {
  idParamSchema,
  ROLES,
  adminUpdateClubSchema,
  createClubSchema,
  departmentLabel,
  mergeClubSchema,
  updateAccountEmailSchema,
  type AdminAccountDto,
  type AdminClubDto,
  type AdminClubDuplicateGroupDto,
  type AdminCreateClubResultDto,
  type AdminStatsDto,
  updateDistrictSchema,
  type DistrictDto,
  type DistrictSource,
  type DistrictStatsDto,
  type Role,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import {
  clubAffiliationRequests,
  clubs,
  districts,
  loginEvents,
  matchAnnouncements,
  matchEvents,
  matches,
  passwordResetRequests,
  refreshTokens,
  teamAvailabilities,
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
import { departmentOf } from "../lib/districts.js";
import { generateTempPassword } from "../lib/passwords.js";
import { clubById } from "../lib/declaredClubs.js";
import { groupLookAlikeClubs } from "../lib/clubMatching.js";
import { revokeAllSessions } from "../lib/sessions.js";
import { hashPassword } from "../lib/passwordHash.js";

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


  /**
   * Liquidité par département.
   *
   * Un marché de matchs amicaux ne devient utilisable qu'une fois DENSE : cinq
   * critères doivent s'aligner (secteur, date, catégorie, niveau, terrain), et
   * tant qu'un département compte dix équipes, presque rien ne s'apparie. Ce
   * tableau existe pour choisir OÙ concentrer l'effort, puis pour savoir quand
   * on y est devenu incontournable.
   *
   * Le chiffre qui décide n'est aucun des totaux, c'est le TAUX
   * D'APPARIEMENT : cent annonces dont dix trouvent preneur décrivent un
   * marché mort, dix annonces dont huit aboutissent décrivent un marché vivant.
   *
   * Le rattachement passe par la ville, jamais deviné : une commune absente de
   * l'annuaire tombe dans une ligne « hors annuaire » plutôt que d'être versée
   * au hasard dans un département dont elle gonflerait les chiffres.
   */
  app.get("/admin/districts", async (): Promise<DistrictStatsDto[]> => {
    const [teamRows, announcementRows, availabilityRows, matchRows, coachRows] = await Promise.all([
      db.select({ id: teams.id, city: teams.city }).from(teams),
      db
        .select({ teamId: matchAnnouncements.teamId, status: matchAnnouncements.status })
        .from(matchAnnouncements),
      db
        .select({ teamId: teamAvailabilities.teamId })
        .from(teamAvailabilities)
        .where(gte(teamAvailabilities.date, sql`current_date`)),
      db
        .select({ homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId })
        .from(matches)
        .where(eq(matches.status, "finished")),
      db
        .select({ coachId: teamCoaches.coachId, teamId: teamCoaches.teamId })
        .from(teamCoaches)
        .innerJoin(users, eq(users.id, teamCoaches.coachId))
        .where(and(eq(users.role, "coach"), isNull(users.disabledAt))),
    ]);

    const departmentByTeam = new Map<string, string | null>();
    for (const team of teamRows) departmentByTeam.set(team.id, departmentOf(team.city));

    const rows = new Map<string | null, DistrictStatsDto>();
    const coachesSeen = new Map<string | null, Set<string>>();
    const of = (code: string | null): DistrictStatsDto => {
      let row = rows.get(code);
      if (!row) {
        row = {
          code,
          label: code === null ? "Hors annuaire" : departmentLabel(code),
          coaches: 0,
          teams: 0,
          announcements: 0,
          announcementsMatched: 0,
          availabilities: 0,
          matchesPlayed: 0,
        };
        rows.set(code, row);
        coachesSeen.set(code, new Set());
      }
      return row;
    };

    for (const team of teamRows) of(departmentByTeam.get(team.id) ?? null).teams++;

    for (const a of announcementRows) {
      const row = of(departmentByTeam.get(a.teamId) ?? null);
      row.announcements++;
      if (a.status === "matched") row.announcementsMatched++;
    }

    for (const a of availabilityRows) of(departmentByTeam.get(a.teamId) ?? null).availabilities++;

    // Un match compte pour les deux départements quand les équipes n'en
    // partagent pas : il fait vivre l'un comme l'autre.
    for (const m of matchRows) {
      const home = departmentByTeam.get(m.homeTeamId) ?? null;
      const away = departmentByTeam.get(m.awayTeamId) ?? null;
      of(home).matchesPlayed++;
      if (away !== home) of(away).matchesPlayed++;
    }

    // Un coach multi-équipes ne compte qu'une fois par département
    for (const c of coachRows) {
      const code = departmentByTeam.get(c.teamId) ?? null;
      const seen = coachesSeen.get(code) ?? (of(code), coachesSeen.get(code)!);
      if (!seen.has(c.coachId)) {
        seen.add(c.coachId);
        of(code).coaches++;
      }
    }

    // Le plus dense d'abord : c'est là que se joue la décision
    return [...rows.values()].sort((a, b) => b.teams - a.teams || b.announcements - a.announcements);
  });


  /**
   * Le référentiel des districts, et sa relecture.
   *
   * La fédération ne publie pas la liste de ses districts, et le registre des
   * associations n'en rend qu'une partie : une dizaine de lignes ont été
   * saisies à la main et attendent d'être confirmées par quelqu'un qui connaît
   * le terrain. Cet écran existe pour ça, et c'est pourquoi il trie les
   * non-vérifiés en tête.
   */
  app.get("/admin/districts-reference", async (): Promise<DistrictDto[]> => {
    const rows = await db.select().from(districts).orderBy(asc(districts.name));
    return rows
      .map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        legalName: d.legalName,
        siren: d.siren,
        city: d.city,
        departments: d.departments,
        source: d.source as DistrictSource,
        verified: d.verified,
      }))
      // Ce qui reste à faire d'abord : un écran de relecture qui enterre les
      // dix lignes à relire sous quatre-vingts lignes correctes ne sert à rien.
      .sort((a, b) => Number(a.verified) - Number(b.verified) || a.name.localeCompare(b.name));
  });

  /**
   * Corriger une ligne. Marquer `verified` protège définitivement la ligne des
   * réimports — c'est le sens du drapeau, pas une simple décoration.
   */
  app.patch("/admin/districts-reference/:id", async (request): Promise<DistrictDto> => {
    const { id } = idParamSchema.parse(request.params);
    const input = updateDistrictSchema.parse(request.body);
    const [current] = await db.select().from(districts).where(eq(districts.id, id));
    if (!current) throw new HttpError(404, "District introuvable");

    const [updated] = await db
      .update(districts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.departments !== undefined ? { departments: input.departments } : {}),
        ...(input.verified !== undefined ? { verified: input.verified } : {}),
      })
      .where(eq(districts.id, id))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      legalName: updated.legalName,
      siren: updated.siren,
      city: updated.city,
      departments: updated.departments,
      source: updated.source as DistrictSource,
      verified: updated.verified,
    };
  });

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

  // Suppression définitive. Un compte club ne se supprime pas seul : il
  // possède des équipes, et sa suppression demande de trancher leur sort — pas
  // couvert ici. Un compte coach, lui, EST supprimé avec tout ce que porte son
  // équipe (teams.coach_id) : matchs joués des deux côtés, annonces, tournois
  // organisés, agenda. Choix assumé et radical — purger un compte de test ou
  // de spam sans rien laisser derrière, pas un simple retrait d'accès (pour
  // ça, /disable, qui est réversible).
  app.delete("/admin/accounts/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const account = await getManageableAccount(id, request.user.id);
    if (account.role === "club") {
      throw new HttpError(400, "Un compte club ne peut pas être supprimé (il possède des équipes)");
    }
    try {
      await db.transaction(async (tx) => {
        if (account.role === "coach") {
          const ownedTeams = await tx.select({ id: teams.id }).from(teams).where(eq(teams.coachId, account.id));
          const teamIds = ownedTeams.map((t) => t.id);

          if (teamIds.length > 0) {
            // Matchs de l'équipe, hôte ou visiteuse — entraîne en cascade
            // events/présences/covoiturage/compos/points (via match_id).
            await tx
              .delete(matches)
              .where(or(inArray(matches.homeTeamId, teamIds), inArray(matches.awayTeamId, teamIds)));
            // Annonces de l'équipe (les matchs qui en découlaient sont déjà partis)
            await tx.delete(matchAnnouncements).where(inArray(matchAnnouncements.teamId, teamIds));
            // Tournois organisés par l'équipe (inscriptions en cascade)
            await tx.delete(tournaments).where(inArray(tournaments.teamId, teamIds));
          }

          // Références nullables au coach en dehors de son équipe (ex. adjoint
          // ailleurs, ou rencontre scannée pour un tiers) : détachées plutôt
          // que bloquantes.
          await tx.update(matches).set({ encounterTokenCoachId: null }).where(eq(matches.encounterTokenCoachId, account.id));
          await tx.update(matches).set({ encounterConfirmedByCoachId: null }).where(eq(matches.encounterConfirmedByCoachId, account.id));
          await tx.update(tournaments).set({ encounterTokenCoachId: null }).where(eq(tournaments.encounterTokenCoachId, account.id));
          await tx
            .update(tournamentRegistrations)
            .set({ checkedInByCoachId: null })
            .where(eq(tournamentRegistrations.checkedInByCoachId, account.id));
          // created_by n'est pas nullable : les événements de match ou d'agenda
          // qu'il a créés ailleurs que sur son équipe (déjà effacée ci-dessus)
          // s'effacent avec lui, faute de pouvoir les réattribuer.
          await tx.delete(matchEvents).where(eq(matchEvents.createdBy, account.id));
          await tx.delete(teamEvents).where(eq(teamEvents.createdBy, account.id));

          if (teamIds.length > 0) {
            await tx.delete(teams).where(inArray(teams.id, teamIds));
          }
        }

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
