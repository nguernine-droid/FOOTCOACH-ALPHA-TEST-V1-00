import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { addRelationSchema, type CoachRelationDto, type UserDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { clubs, coachRelations, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { avatarUrlOf, toUserDto } from "./auth.js";
import { UPLOADS_DIR } from "../lib/uploads.js";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Fiches complètes des coachs liés : contact + club + équipes encadrées */
async function buildRelations(coachIds: string[], createdAtById: Map<string, Date>): Promise<CoachRelationDto[]> {
  if (coachIds.length === 0) return [];

  const coachRows = await db
    .select()
    .from(users)
    .where(inArray(users.id, coachIds))
    .orderBy(asc(users.lastName), asc(users.firstName));

  const clubIds = [...new Set(coachRows.map((c) => c.clubId).filter((id): id is string => id != null))];
  const clubRows = clubIds.length ? await db.select().from(clubs).where(inArray(clubs.id, clubIds)) : [];
  const clubById = new Map(clubRows.map((c) => [c.id, c.name]));

  const teamRows = await db
    .select({ coachId: teamCoaches.coachId, id: teams.id, name: teams.name, city: teams.city })
    .from(teamCoaches)
    .innerJoin(teams, eq(teamCoaches.teamId, teams.id))
    .where(inArray(teamCoaches.coachId, coachIds));

  return coachRows.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    avatarUrl: avatarUrlOf(c.avatarPath),
    clubName: c.clubId ? (clubById.get(c.clubId) ?? null) : null,
    teams: teamRows.filter((t) => t.coachId === c.id).map(({ id, name, city }) => ({ id, name, city })),
    createdAt: (createdAtById.get(c.id) ?? new Date()).toISOString(),
  }));
}

export function relationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // --- Photo de profil : fichier dans le volume d'uploads, servi en statique ---

  app.post("/me/avatar", async (request): Promise<UserDto> => {
    const file = await request.file({ limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } });
    if (!file) throw new HttpError(400, "Aucun fichier reçu");

    const extension = ALLOWED_IMAGE_TYPES[file.mimetype];
    if (!extension) throw new HttpError(400, "Format accepté : JPEG, PNG ou WebP");

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch {
      throw new HttpError(413, "Image trop lourde (2 Mo maximum)");
    }
    if (file.file.truncated) throw new HttpError(413, "Image trop lourde (2 Mo maximum)");

    const [current] = await db.select().from(users).where(eq(users.id, request.user.id));
    if (!current) throw new HttpError(404, "Utilisateur introuvable");

    // Nom unique à chaque envoi : les caches navigateur ne servent pas l'ancienne photo
    const fileName = `${request.user.id}-${randomUUID().slice(0, 8)}.${extension}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, fileName), buffer);

    const [updated] = await db
      .update(users)
      .set({ avatarPath: fileName })
      .where(eq(users.id, request.user.id))
      .returning();

    if (current.avatarPath) {
      await unlink(path.join(UPLOADS_DIR, current.avatarPath)).catch(() => undefined);
    }
    return toUserDto(updated);
  });

  app.delete("/me/avatar", async (request): Promise<UserDto> => {
    const [current] = await db.select().from(users).where(eq(users.id, request.user.id));
    if (!current) throw new HttpError(404, "Utilisateur introuvable");
    const [updated] = await db
      .update(users)
      .set({ avatarPath: null })
      .where(eq(users.id, request.user.id))
      .returning();
    if (current.avatarPath) {
      await unlink(path.join(UPLOADS_DIR, current.avatarPath)).catch(() => undefined);
    }
    return toUserDto(updated);
  });

  // --- Réseau de relations entre coachs ---

  app.register((coach) => {
    coach.addHook("preHandler", requireRole("coach"));

    coach.get("/coach/relations", async (request): Promise<CoachRelationDto[]> => {
      const rows = await db
        .select()
        .from(coachRelations)
        .where(eq(coachRelations.coachId, request.user.id));
      const createdAtById = new Map(rows.map((r) => [r.relatedCoachId, r.createdAt]));
      return buildRelations([...createdAtById.keys()], createdAtById);
    });

    /**
     * Ajout par code coach. Le lien est réciproque et immédiat : détenir le code
     * suppose d'avoir vu l'écran de l'autre coach ou reçu son code de sa part.
     */
    coach.post("/coach/relations", async (request, reply): Promise<CoachRelationDto> => {
      const input = addRelationSchema.parse(request.body);
      const code = input.code.toUpperCase().trim();

      const [target] = await db
        .select()
        .from(users)
        .where(and(eq(users.coachCode, code), eq(users.role, "coach"), ne(users.id, request.user.id)));
      if (!target) {
        // Message unique : ne pas laisser deviner si un code existe mais est le sien
        throw new HttpError(404, "Code coach inconnu");
      }
      if (target.disabledAt) throw new HttpError(400, "Ce compte coach est désactivé");

      const [existing] = await db
        .select()
        .from(coachRelations)
        .where(and(eq(coachRelations.coachId, request.user.id), eq(coachRelations.relatedCoachId, target.id)));
      if (existing) throw new HttpError(400, `${target.firstName} ${target.lastName} fait déjà partie de vos relations`);

      await db.transaction(async (tx) => {
        await tx
          .insert(coachRelations)
          .values([
            { coachId: request.user.id, relatedCoachId: target.id },
            { coachId: target.id, relatedCoachId: request.user.id },
          ])
          .onConflictDoNothing();
      });

      reply.code(201);
      const [dto] = await buildRelations([target.id], new Map([[target.id, new Date()]]));
      return dto;
    });

    // Retrait : les deux sens disparaissent, la relation n'a pas de sens à moitié
    coach.delete("/coach/relations/:coachId", async (request) => {
      const { coachId } = request.params as { coachId: string };
      const deleted = await db
        .delete(coachRelations)
        .where(
          and(
            inArray(coachRelations.coachId, [request.user.id, coachId]),
            inArray(coachRelations.relatedCoachId, [request.user.id, coachId]),
          ),
        )
        .returning();
      if (deleted.length === 0) throw new HttpError(404, "Cette relation n'existe pas");
      return { ok: true };
    });
  });
}
