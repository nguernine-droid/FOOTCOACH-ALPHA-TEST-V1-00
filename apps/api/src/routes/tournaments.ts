import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import {
  checkInTournamentSchema,
  createTournamentSchema,
  idParamSchema,
  levelForPoints,
  withdrawTournamentSchema,
  MATCH_POINTS,
  type EncounterResultDto,
  type TournamentDetailDto,
  type TournamentDto,
  type TournamentRegistrationDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { coachPoints, teamCoaches, teams, tournamentRegistrations, tournaments } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { bearingDeg, cityCoords, haversineKm } from "../lib/cities.js";
import { loadOrigin } from "../lib/coachOrigin.js";
import { storeUploadedImage, removeUploadedImage } from "../lib/imageUpload.js";
import { MAX_POSTER_BYTES } from "../lib/images.js";
import { totalPointsOf } from "../lib/points.js";
import { tokensMatch } from "../lib/tokens.js";
import { notifyTournamentSos } from "../lib/push.js";

type TournamentRow = { tournament: typeof tournaments.$inferSelect; team: typeof teams.$inferSelect };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** URL publique d'une affiche, servie par l'API comme les photos de profil */
export function posterUrlOf(posterPath: string | null): string | null {
  return posterPath ? `/api/uploads/${posterPath}` : null;
}

/**
 * Le pointage n'a de sens qu'à partir du jour du tournoi : avant, il n'y a
 * personne à accueillir. Calculé au serveur, l'horloge d'un téléphone se règle.
 */
function checkInDayReached(tournament: typeof tournaments.$inferSelect): boolean {
  return new Date(`${tournament.date}T00:00`).getTime() <= Date.now();
}

function toRegistrationDto(
  registration: typeof tournamentRegistrations.$inferSelect,
  team: typeof teams.$inferSelect,
): TournamentRegistrationDto {
  return {
    id: registration.id,
    team: { id: team.id, name: team.name, city: team.city },
    status: registration.status,
    checkedInAt: registration.checkedInAt?.toISOString() ?? null,
    createdAt: registration.createdAt.toISOString(),
  };
}

/**
 * Inscriptions d'une série de tournois, indexées par tournoi. Une seule requête
 * pour tout le radar : une par tournoi aurait suffi à le rendre lent dès qu'il
 * s'en tient trois dans le secteur.
 */
async function loadRegistrations(tournamentIds: string[]) {
  const byTournament = new Map<string, { registration: typeof tournamentRegistrations.$inferSelect; team: typeof teams.$inferSelect }[]>();
  if (tournamentIds.length === 0) return byTournament;
  const rows = await db
    .select({ registration: tournamentRegistrations, team: teams })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
    .where(inArray(tournamentRegistrations.tournamentId, tournamentIds))
    .orderBy(tournamentRegistrations.createdAt);
  for (const row of rows) {
    const list = byTournament.get(row.registration.tournamentId) ?? [];
    list.push(row);
    byTournament.set(row.registration.tournamentId, list);
  }
  return byTournament;
}

export function toTournamentDto(
  { tournament, team }: TournamentRow,
  registrations: { registration: typeof tournamentRegistrations.$inferSelect; team: typeof teams.$inferSelect }[],
  myTeamId: string | null,
  myCoords?: { lat: number; lng: number } | null,
): TournamentDto {
  const active = registrations.filter((r) => r.registration.status === "registered");
  // Le lieu du tournoi, pas le siège de l'organisateur : c'est le déplacement
  // réel qui intéresse le coach.
  const venue = tournament.teamId !== myTeamId ? cityCoords(tournament.city) : null;
  const mine = registrations.find((r) => r.registration.teamId === myTeamId) ?? null;
  return {
    id: tournament.id,
    team: { id: team.id, name: team.name, city: team.city },
    name: tournament.name,
    date: tournament.date,
    endDate: tournament.endDate,
    time: tournament.time.slice(0, 5),
    city: tournament.city,
    stadium: tournament.stadium,
    category: tournament.category,
    gender: tournament.gender,
    level: tournament.level,
    format: tournament.format,
    slots: tournament.slots,
    registeredCount: active.length,
    slotsLeft: Math.max(0, tournament.slots - active.length),
    posterUrl: posterUrlOf(tournament.posterPath),
    comment: tournament.comment,
    status: tournament.status,
    isSos: tournament.isSos,
    sosReason: tournament.sosReason,
    sosDetails: tournament.sosDetails,
    isMine: tournament.teamId === myTeamId,
    myRegistration: mine ? toRegistrationDto(mine.registration, mine.team) : null,
    distanceKm: myCoords && venue ? haversineKm(myCoords, venue) : null,
    bearingDeg: myCoords && venue ? bearingDeg(myCoords, venue) : null,
    createdAt: tournament.createdAt.toISOString(),
    // Jamais servi dans une liste : le jeton ne sort qu'au coach organisateur
    // qui demande explicitement à l'afficher (POST /tournaments/:id/check-in-qr).
    checkInToken: null,
    checkInOpen: checkInDayReached(tournament) && tournament.status !== "cancelled",
  };
}

/**
 * Tournois ouverts du périmètre d'un coach, pour le radar. Exporté parce que
 * c'est la route du radar des annonces qui les sert — le coach cherche « quoi
 * jouer », pas « quelle sorte d'objet ».
 *
 * Les tournois de ses propres équipes sont écartés comme ses annonces le sont :
 * il les retrouve dans « Mes tournois ».
 */
export async function tournamentsInRadar(
  myTeamId: string | null,
  excludeTeamIds: string[],
  myCoords: { lat: number; lng: number } | null,
  radiusKm: number | null,
): Promise<TournamentDto[]> {
  const rows = await db
    .select({ tournament: tournaments, team: teams })
    .from(tournaments)
    .innerJoin(teams, eq(tournaments.teamId, teams.id))
    .where(
      and(
        eq(tournaments.status, "open"),
        gte(tournaments.date, today()),
        excludeTeamIds.length > 0 ? notIn(excludeTeamIds) : undefined,
      ),
    )
    .orderBy(desc(tournaments.isSos), desc(tournaments.createdAt));

  const registrations = await loadRegistrations(rows.map((r) => r.tournament.id));
  const items: TournamentDto[] = [];
  for (const row of rows) {
    const dto = toTournamentDto(row, registrations.get(row.tournament.id) ?? [], myTeamId, myCoords);
    // Hors périmètre : écarté sans être compté à part. `beyondRadius` reste le
    // compteur des ANNONCES, un chiffre qui mélangerait les deux ne dirait plus
    // ce qu'on gagne à balayer plus large.
    if (radiusKm !== null && dto.distanceKm !== null && dto.distanceKm > radiusKm) continue;
    // Un tournoi complet reste visible — il informe encore — mais il ne se
    // présente plus comme une occasion : le client le grise.
    items.push(dto);
  }
  return items;
}

/** `not in` lisible, drizzle n'exposant pas d'aide pour une liste vide */
function notIn(teamIds: string[]) {
  return sql`${tournaments.teamId} not in (${sql.join(
    teamIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`;
}

export function tournamentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  async function getTournamentOr404(id: string): Promise<TournamentRow> {
    const [row] = await db
      .select({ tournament: tournaments, team: teams })
      .from(tournaments)
      .innerJoin(teams, eq(tournaments.teamId, teams.id))
      .where(eq(tournaments.id, id));
    if (!row) throw new HttpError(404, "Tournoi introuvable");
    return row;
  }

  async function detailDto(
    row: TournamentRow,
    userId: string,
    myTeamId: string | null,
  ): Promise<TournamentDetailDto> {
    const registrations = (await loadRegistrations([row.tournament.id])).get(row.tournament.id) ?? [];
    // Position du coach — la même qui sert au radar : sa position réglée, ou à
    // défaut la ville de son équipe. Sans elle, la distance reste nulle.
    const myCoords = await loadOrigin(userId, myTeamId);
    return {
      ...toTournamentDto(row, registrations, myTeamId, myCoords),
      // Les équipes retirées restent dans la liste, barrées : c'est ce qui
      // explique une place rouverte à qui regarde le tournoi.
      registrations: registrations.map((r) => toRegistrationDto(r.registration, r.team)),
    };
  }

  /**
   * Les tournois que j'organise, et ceux auxquels je suis inscrit.
   *
   * Ceux que J'ORGANISE sont cherchés sur TOUTES mes équipes, pas seulement
   * l'équipe active : un coach qui en encadre trois a monté son tournoi avec
   * l'une d'elles, et il vient le retrouver sans se souvenir laquelle. Les
   * INSCRIPTIONS, elles, restent celles de l'équipe active — c'est une équipe
   * précise qui est inscrite, pas le coach.
   */
  app.get("/tournaments/mine", { preHandler: requireRole("coach") }, async (request): Promise<TournamentDto[]> => {
    const myTeamId = request.user.teamId;
    if (!myTeamId) return [];
    const myTeams = await db
      .select({ teamId: teamCoaches.teamId })
      .from(teamCoaches)
      .where(eq(teamCoaches.coachId, request.user.id));
    const myTeamIds = [...new Set([myTeamId, ...myTeams.map((t) => t.teamId)])];

    const registered = await db
      .select({ tournamentId: tournamentRegistrations.tournamentId })
      .from(tournamentRegistrations)
      .where(
        and(eq(tournamentRegistrations.teamId, myTeamId), eq(tournamentRegistrations.status, "registered")),
      );
    const ids = registered.map((r) => r.tournamentId);

    const rows = await db
      .select({ tournament: tournaments, team: teams })
      .from(tournaments)
      .innerJoin(teams, eq(tournaments.teamId, teams.id))
      .where(
        ids.length > 0
          ? or(inArray(tournaments.teamId, myTeamIds), inArray(tournaments.id, ids))
          : inArray(tournaments.teamId, myTeamIds),
      )
      .orderBy(desc(tournaments.date));

    const registrations = await loadRegistrations(rows.map((r) => r.tournament.id));
    return rows.map((r) => ({
      ...toTournamentDto(r, registrations.get(r.tournament.id) ?? [], myTeamId),
      // `isMine` est calculé ailleurs sur la seule équipe active ; ici il dit
      // « c'est moi qui l'organise », quelle que soit l'équipe qui le porte.
      isMine: myTeamIds.includes(r.tournament.teamId),
    }));
  });

  app.get("/tournaments/:id", async (request): Promise<TournamentDetailDto> => {
    const { id } = idParamSchema.parse(request.params);
    return detailDto(await getTournamentOr404(id), request.user.id, request.user.teamId);
  });

  app.post("/tournaments", { preHandler: requireRole("coach") }, async (request, reply) => {
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const input = createTournamentSchema.parse(request.body);
    const [created] = await db
      .insert(tournaments)
      .values({
        teamId: request.user.teamId,
        name: input.name,
        date: input.date,
        endDate: input.endDate ?? null,
        time: input.time,
        city: input.city,
        stadium: input.stadium,
        category: input.category,
        gender: input.gender,
        level: input.level,
        format: input.format,
        slots: input.slots,
        comment: input.comment ?? null,
      })
      .returning();
    reply.code(201);
    return { id: created.id };
  });

  /**
   * Affiche du tournoi, envoyée séparément de sa création.
   *
   * Deux appels et non un multipart unique : le formulaire doit pouvoir créer
   * un tournoi sans image, et une affiche se remplace ensuite sans retoucher
   * le reste. Le fichier remplacé est effacé — une affiche corrigée trois fois
   * laisserait sinon trois images vivantes dans le volume.
   */
  app.post("/tournaments/:id/poster", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { tournament } = await getTournamentOr404(id);
    if (tournament.teamId !== request.user.teamId) {
      throw new HttpError(403, "Seul l'organisateur peut changer l'affiche");
    }
    const file = await request.file({ limits: { fileSize: MAX_POSTER_BYTES, files: 1 } });
    const fileName = await storeUploadedImage(file, `tournoi-${id}`, "2 Mo");
    await db.update(tournaments).set({ posterPath: fileName }).where(eq(tournaments.id, id));
    await removeUploadedImage(tournament.posterPath);
    return { posterUrl: posterUrlOf(fileName) };
  });

  /** Annulation par l'organisateur. Le tournoi quitte le radar, sa trace reste. */
  app.delete("/tournaments/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { tournament } = await getTournamentOr404(id);
    if (tournament.teamId !== request.user.teamId) {
      throw new HttpError(403, "Seul l'organisateur peut annuler ce tournoi");
    }
    await db
      .update(tournaments)
      .set({ status: "cancelled", isSos: false, sosAlertedAt: null, sosWidenedAt: null })
      .where(eq(tournaments.id, id));
    return { ok: true };
  });

  /**
   * Inscription directe : le coach clique, il est pris. Aucune validation de
   * l'organisateur — c'est le choix qui rend l'inscription immédiate, au prix
   * de ne pas choisir ses équipes.
   *
   * La place est réservée dans une transaction qui RECOMPTE les inscrits :
   * deux coachs qui cliquent sur la dernière place en même temps liraient
   * sinon tous les deux « il en reste une ».
   */
  app.post("/tournaments/:id/register", { preHandler: requireRole("coach") }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const myTeamId = request.user.teamId;
    if (!myTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const { tournament } = await getTournamentOr404(id);

    if (tournament.status === "cancelled") throw new HttpError(400, "Ce tournoi a été annulé");
    if (tournament.date < today()) throw new HttpError(400, "Ce tournoi est passé");
    if (tournament.teamId === myTeamId) {
      throw new HttpError(400, "Vous organisez ce tournoi : votre équipe y est déjà");
    }

    await db.transaction(async (tx) => {
      // Verrou sur la ligne du tournoi : c'est lui qui sérialise les
      // inscriptions concurrentes sur la dernière place.
      await tx.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.id, id)).for("update");
      const [{ value: taken }] = await tx
        .select({ value: sql<number>`count(*)::int` })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, id),
            eq(tournamentRegistrations.status, "registered"),
          ),
        );
      const [existing] = await tx
        .select()
        .from(tournamentRegistrations)
        .where(
          and(eq(tournamentRegistrations.tournamentId, id), eq(tournamentRegistrations.teamId, myTeamId)),
        );
      if (existing?.status === "registered") throw new HttpError(400, "Votre équipe est déjà inscrite");
      if (taken >= tournament.slots) throw new HttpError(400, "Ce tournoi est complet");

      if (existing) {
        // Réinscription après un retrait : on reprend la même ligne plutôt que
        // d'en empiler une seconde, l'unicité (tournoi, équipe) l'impose.
        await tx
          .update(tournamentRegistrations)
          .set({ status: "registered", withdrawnAt: null })
          .where(eq(tournamentRegistrations.id, existing.id));
      } else {
        await tx.insert(tournamentRegistrations).values({ tournamentId: id, teamId: myTeamId });
      }

      /**
       * Une inscription éteint le SOS, sans attendre que le tournoi soit
       * complet : le SOS ne dit pas « il reste des places », il dit « une place
       * s'est rouverte par un désistement ». Cette place-là vient d'être
       * reprise. Les autres places libres n'ont jamais été des urgences, et
       * laisser l'alerte allumée jusqu'au complet reviendrait à harceler les
       * jokers pour un tournoi qui se remplit normalement.
       */
      if (tournament.isSos) {
        await tx
          .update(tournaments)
          .set({ isSos: false, sosReason: null, sosDetails: null, sosAlertedAt: null, sosWidenedAt: null })
          .where(eq(tournaments.id, id));
      }
    });

    reply.code(201);
    return { ok: true };
  });

  /**
   * Retrait d'une équipe inscrite. La place se rouvre, le tournoi passe en SOS
   * et les jokers du secteur sont alertés — exactement comme une annonce dont
   * l'adversaire se désiste.
   */
  app.post("/tournaments/:id/withdraw", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = withdrawTournamentSchema.parse(request.body);
    const myTeamId = request.user.teamId;
    if (!myTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const { tournament, team: organizer } = await getTournamentOr404(id);

    const [registration] = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(eq(tournamentRegistrations.tournamentId, id), eq(tournamentRegistrations.teamId, myTeamId)),
      );
    if (!registration || registration.status !== "registered") {
      throw new HttpError(400, "Votre équipe n'est pas inscrite à ce tournoi");
    }

    const details = input.details?.length ? input.details : null;
    await db.transaction(async (tx) => {
      await tx
        .update(tournamentRegistrations)
        .set({ status: "withdrawn", withdrawnAt: new Date() })
        .where(eq(tournamentRegistrations.id, registration.id));
      // Un tournoi déjà annulé ne repart pas en SOS : il n'y a plus de place à
      // pourvoir, seulement une équipe de moins dans un tournoi qui n'aura pas lieu.
      if (tournament.status === "open" && tournament.date >= today()) {
        await tx
          .update(tournaments)
          .set({
            isSos: true,
            sosReason: input.reason,
            sosDetails: details,
            sosAlertedAt: new Date(),
            sosWidenedAt: null,
          })
          .where(eq(tournaments.id, id));
      }
    });

    if (tournament.status === "open" && tournament.date >= today()) {
      notifyTournamentSos({
        tournamentId: id,
        tournamentName: tournament.name,
        organizerTeamName: organizer.name,
        category: tournament.category,
        city: tournament.city,
        date: tournament.date,
        venue: cityCoords(tournament.city),
        excludeTeamIds: [tournament.teamId, myTeamId],
      });
    }
    return { ok: true, slotReopened: tournament.status === "open" };
  });

  /**
   * QR d'arrivée, servi au seul coach de l'équipe ORGANISATRICE. L'appel
   * retient lequel l'a affiché : c'est lui qui touchera le forfait
   * d'organisation, et non « le coach principal » de l'équipe.
   *
   * Le jeton naît au premier affichage et ne change plus : le régénérer
   * invaliderait les QR déjà ouverts devant la file des équipes qui arrivent.
   */
  app.post("/tournaments/:id/check-in-qr", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { tournament } = await getTournamentOr404(id);
    if (tournament.teamId !== request.user.teamId) {
      throw new HttpError(403, "C'est l'organisateur qui montre le QR code");
    }
    if (tournament.status === "cancelled") throw new HttpError(400, "Ce tournoi a été annulé");
    if (!checkInDayReached(tournament)) {
      throw new HttpError(400, "Le QR code d'arrivée s'ouvre le jour du tournoi");
    }
    const token = tournament.encounterToken ?? crypto.randomBytes(24).toString("base64url");
    await db
      .update(tournaments)
      .set({ encounterToken: token, encounterTokenCoachId: request.user.id })
      .where(eq(tournaments.id, id));
    return { token };
  });

  /**
   * Pointage d'une équipe à son arrivée : le coach scanne le QR de
   * l'organisateur. Deux garde-fous cumulés — son équipe doit être inscrite, et
   * il doit présenter le jeton, qu'il ne peut obtenir qu'en le voyant sur place.
   *
   * Le coach qui scanne gagne les points d'une venue ; l'organisateur touche
   * son forfait UNE SEULE FOIS, au premier pointage.
   */
  app.post("/tournaments/:id/check-in", { preHandler: requireRole("coach") }, async (request): Promise<EncounterResultDto> => {
    const { id } = idParamSchema.parse(request.params);
    const input = checkInTournamentSchema.parse(request.body);
    const myTeamId = request.user.teamId;
    if (!myTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const { tournament } = await getTournamentOr404(id);

    if (tournament.status === "cancelled") throw new HttpError(400, "Ce tournoi a été annulé");
    if (!tournament.encounterToken) {
      throw new HttpError(400, "L'organisateur n'a pas encore affiché son QR code");
    }
    const [registration] = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(eq(tournamentRegistrations.tournamentId, id), eq(tournamentRegistrations.teamId, myTeamId)),
      );
    if (!registration || registration.status !== "registered") {
      throw new HttpError(403, "Votre équipe n'est pas inscrite à ce tournoi");
    }
    if (registration.checkedInAt) throw new HttpError(400, "Votre équipe est déjà pointée");
    // Comparaison à durée constante, comme pour la rencontre d'un amical.
    if (!tokensMatch(input.token, tournament.encounterToken)) {
      throw new HttpError(400, "QR code invalide — demandez à l'organisateur de réafficher le sien");
    }

    let pointsAwarded = 0;
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(tournamentRegistrations)
        .set({ checkedInAt: new Date(), checkedInByCoachId: request.user.id })
        .where(and(eq(tournamentRegistrations.id, registration.id), sql`checked_in_at is null`))
        .returning({ id: tournamentRegistrations.id });
      // Deux scans simultanés : le second ne trouve plus la ligne à pointer.
      if (!updated) throw new HttpError(400, "Votre équipe vient d'être pointée");

      // `onConflictDoNothing` sur l'unicité (tournoi, coach) : un coach qui a
      // engagé DEUX de ses équipes pointe deux fois, et n'est payé qu'une.
      const inserted = await tx
        .insert(coachPoints)
        .values({
          coachId: request.user.id,
          tournamentId: id,
          points: MATCH_POINTS.tournoi,
          reason: "tournoi",
        })
        .onConflictDoNothing()
        .returning({ id: coachPoints.id });
      pointsAwarded = inserted.length > 0 ? MATCH_POINTS.tournoi : 0;

      // Forfait d'organisation, au premier pointage seulement — la même
      // unicité (tournoi, coach) s'en charge sans qu'on ait à compter.
      if (tournament.encounterTokenCoachId) {
        await tx
          .insert(coachPoints)
          .values({
            coachId: tournament.encounterTokenCoachId,
            tournamentId: id,
            points: MATCH_POINTS.organisation,
            reason: "organisation",
          })
          .onConflictDoNothing();
      }
    });

    const totalPoints = await totalPointsOf(request.user.id);
    return {
      pointsAwarded,
      reason: "tournoi",
      cappedByCooldown: false,
      totalPoints,
      level: levelForPoints(totalPoints),
    };
  });
}
