import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { coarseCoord, type GeoSuggestionDto, type UserDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { pushSubscriptions, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { reverseGeocode, searchAddresses } from "../lib/geocoding.js";
import { pushEnabled, vapidPublicKey } from "../lib/push.js";
import { toUserDto } from "./auth.js";

const setLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().trim().min(1).max(160),
  source: z.enum(["gps", "address"]),
});

const radiusSchema = z.object({
  /** null = radar sans limite */
  radiusKm: z.number().int().min(1).max(500).nullable(),
});

const notificationPrefsSchema = z.object({
  newAnnouncement: z.boolean(),
  announcementResponse: z.boolean(),
  responseDecision: z.boolean(),
  score: z.boolean(),
  message: z.boolean(),
  freeWeekend: z.boolean(),
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/**
 * Position du coach, préférences de radar et abonnements aux notifications.
 * Le géocodage passe par le serveur : le navigateur ne contacte jamais
 * directement l'API Adresse.
 */
export function locationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // ————— Géocodage —————

  app.get("/geo/search", { preHandler: requireRole("coach") }, async (request): Promise<GeoSuggestionDto[]> => {
    const { q } = request.query as { q?: string };
    return q ? searchAddresses(q) : [];
  });

  app.get("/geo/reverse", { preHandler: requireRole("coach") }, async (request) => {
    const { lat, lng } = request.query as { lat?: string; lng?: string };
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) throw new HttpError(400, "Coordonnées invalides");
    return { suggestion: await reverseGeocode(coarseCoord(latN), coarseCoord(lngN)) };
  });

  // ————— Position —————

  app.put("/me/location", { preHandler: requireRole("coach") }, async (request): Promise<UserDto> => {
    const input = setLocationSchema.parse(request.body);
    const [updated] = await db
      .update(users)
      .set({
        // Arrondi côté serveur aussi : un client modifié ne peut pas imposer
        // une position plus fine que ce que le produit conserve.
        lat: coarseCoord(input.lat),
        lng: coarseCoord(input.lng),
        locationLabel: input.label,
        locationSource: input.source,
      })
      .where(eq(users.id, request.user.id))
      .returning();
    return toUserDto(updated);
  });

  /** Revenir au repli : la ville de l'équipe */
  app.delete("/me/location", { preHandler: requireRole("coach") }, async (request): Promise<UserDto> => {
    const [updated] = await db
      .update(users)
      .set({ lat: null, lng: null, locationLabel: null, locationSource: null })
      .where(eq(users.id, request.user.id))
      .returning();
    return toUserDto(updated);
  });

  /** Périmètre du radar — côté serveur, car il décide aussi qui notifier */
  app.put("/me/radar-radius", { preHandler: requireRole("coach") }, async (request): Promise<UserDto> => {
    const { radiusKm } = radiusSchema.parse(request.body);
    const [updated] = await db
      .update(users)
      .set({ radarRadiusKm: radiusKm })
      .where(eq(users.id, request.user.id))
      .returning();
    return toUserDto(updated);
  });

  // ————— Notifications —————

  app.get("/push/config", async () => ({
    enabled: pushEnabled(),
    publicKey: vapidPublicKey(),
  }));

  app.put("/me/notifications", { preHandler: requireRole("coach") }, async (request): Promise<UserDto> => {
    const prefs = notificationPrefsSchema.parse(request.body);
    const [updated] = await db
      .update(users)
      .set({
        notifyNewAnnouncement: prefs.newAnnouncement,
        notifyAnnouncementResponse: prefs.announcementResponse,
        notifyResponseDecision: prefs.responseDecision,
        notifyScore: prefs.score,
        notifyMessage: prefs.message,
        notifyFreeWeekend: prefs.freeWeekend,
      })
      .where(eq(users.id, request.user.id))
      .returning();
    return toUserDto(updated);
  });

  /** Enregistre l'appareil courant. Rejouable : le même endpoint est réutilisé. */
  app.post("/push/subscribe", { preHandler: requireRole("coach") }, async (request, reply) => {
    if (!pushEnabled()) throw new HttpError(503, "Les notifications ne sont pas configurées sur ce serveur");
    const input = subscribeSchema.parse(request.body);
    await db
      .insert(pushSubscriptions)
      .values({
        userId: request.user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: request.headers["user-agent"] ?? null,
      })
      // Un même endpoint peut changer de main (compte partagé sur un appareil)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId: request.user.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
      });
    reply.code(201);
    return { ok: true };
  });

  app.delete("/push/subscribe", { preHandler: requireRole("coach") }, async (request) => {
    const { endpoint } = request.body as { endpoint?: string };
    if (!endpoint) throw new HttpError(400, "Endpoint manquant");
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, request.user.id), eq(pushSubscriptions.endpoint, endpoint)));
    return { ok: true };
  });

  /** L'appareil courant est-il déjà enregistré pour ce compte ? */
  app.get("/push/subscription", { preHandler: requireRole("coach") }, async (request) => {
    const { endpoint } = request.query as { endpoint?: string };
    if (!endpoint) return { subscribed: false };
    const [row] = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, request.user.id), eq(pushSubscriptions.endpoint, endpoint)));
    return { subscribed: Boolean(row) };
  });
}
