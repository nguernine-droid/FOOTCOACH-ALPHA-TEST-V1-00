import webpush from "web-push";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { pushSubscriptions, teamCoaches, teams, users } from "../db/schema.js";
import { originOf } from "./coachOrigin.js";
import { haversineKm } from "./cities.js";

/**
 * Notifications Web Push.
 *
 * Tout est optionnel : sans paire VAPID configurée, `pushEnabled()` est faux et
 * chaque envoi devient un no-op — l'API tourne exactement comme avant.
 *
 * Les envois ne sont jamais attendus par une route : un service de push lent ne
 * doit pas retarder la réponse du coach qui vient de publier son annonce.
 */
export function pushEnabled(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function vapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

let configured = false;
function configure(): boolean {
  if (!pushEnabled()) return false;
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Chemin ouvert au clic sur la notification */
  url: string;
  /** Regroupe les notifications d'un même sujet (une seule reste affichée) */
  tag?: string;
}

/** Envoie à tous les appareils enregistrés de ces comptes. */
async function sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!configure() || userIds.length === 0) return;
  const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err) {
        // 404/410 : l'utilisateur a désinstallé l'app ou révoqué l'autorisation.
        // L'abonnement ne redeviendra jamais valide, on le supprime.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).catch(() => undefined);
        } else {
          console.error("[push] échec d'envoi", status ?? err);
        }
      }
    }),
  );
}

/** Lance l'envoi sans bloquer la requête en cours. */
function fireAndForget(task: Promise<void>): void {
  void task.catch((err) => console.error("[push] notification abandonnée", err));
}

/**
 * Coachs abonnés au push pour un type de notification donné, avec leur point
 * de rayonnement. Une seule requête, dédoublonnée par compte : un coach peut
 * avoir plusieurs appareils et plusieurs équipes.
 */
async function candidates(
  pref: "notifyNewAnnouncement" | "notifyAnnouncementResponse" | "notifyResponseDecision" | "notifyScore",
  excludeUserId?: string,
) {
  const rows = await db
    .select({ user: users, team: teams })
    .from(users)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
    .leftJoin(teamCoaches, eq(teamCoaches.coachId, users.id))
    .leftJoin(teams, eq(teams.id, teamCoaches.teamId))
    .where(
      and(
        eq(users.role, "coach"),
        isNull(users.disabledAt),
        eq(users[pref], true),
        excludeUserId ? ne(users.id, excludeUserId) : undefined,
      ),
    );

  const byUser = new Map<string, { user: typeof users.$inferSelect; team: typeof teams.$inferSelect | null }>();
  for (const row of rows) if (!byUser.has(row.user.id)) byUser.set(row.user.id, row);
  return [...byUser.values()];
}

/**
 * Une annonce vient d'être publiée : prévient les coachs dont le périmètre
 * couvre le lieu du match. Un coach sans position connue n'est pas notifié —
 * on ne peut pas affirmer que l'annonce le concerne.
 */
export function notifyNewAnnouncement(input: {
  authorUserId: string;
  teamName: string;
  category: string;
  format: string;
  city: string;
  venue: { lat: number; lng: number } | null;
}): void {
  if (!pushEnabled() || !input.venue) return;
  fireAndForget(
    (async () => {
      const targets: string[] = [];
      for (const { user, team } of await candidates("notifyNewAnnouncement", input.authorUserId)) {
        const origin = originOf(user, team);
        if (!origin) continue;
        const km = haversineKm(origin, input.venue!);
        // radarRadiusKm null = sans limite : tout est dans le périmètre
        if (user.radarRadiusKm !== null && km > user.radarRadiusKm) continue;
        targets.push(user.id);
      }
      await sendToUsers(targets, {
        title: `${input.teamName} cherche un adversaire`,
        body: `${input.category} · ${input.format} · à ${input.city}`,
        url: "/coach",
        tag: "annonce",
      });
    })(),
  );
}

/** Coachs d'une équipe qui acceptent ce type de notification. */
async function teamCoachesToNotify(
  teamId: string,
  pref: "notifyAnnouncementResponse" | "notifyResponseDecision" | "notifyScore",
): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(teamCoaches, eq(teamCoaches.coachId, users.id))
    .where(and(eq(teamCoaches.teamId, teamId), isNull(users.disabledAt), eq(users[pref], true)));
  return [...new Set(rows.map((r) => r.id))];
}

/** Une équipe propose de jouer mon annonce. */
export function notifyAnnouncementResponse(input: {
  ownerTeamId: string;
  responderTeamName: string;
  city: string;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      await sendToUsers(await teamCoachesToNotify(input.ownerTeamId, "notifyAnnouncementResponse"), {
        title: "Une équipe veut jouer votre annonce",
        body: `${input.responderTeamName} propose de jouer à ${input.city}.`,
        url: "/coach/announcements",
        tag: "proposition",
      });
    })(),
  );
}

/** Ma proposition a été acceptée ou déclinée. */
export function notifyResponseDecision(input: {
  responderTeamId: string;
  accepted: boolean;
  opponentTeamName: string;
  matchId: string | null;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      await sendToUsers(await teamCoachesToNotify(input.responderTeamId, "notifyResponseDecision"), {
        title: input.accepted ? "Match confirmé" : "Proposition déclinée",
        body: input.accepted
          ? `${input.opponentTeamName} a accepté votre proposition.`
          : `${input.opponentTeamName} a décliné votre proposition.`,
        url: input.accepted && input.matchId ? `/coach/matches/${input.matchId}` : "/coach/announcements",
        tag: "decision",
      });
    })(),
  );
}

/** Score saisi par l'adversaire, en attente de ma validation par QR code. */
export function notifyScoreToConfirm(input: {
  opponentTeamId: string;
  submittedByTeamName: string;
  matchId: string;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      await sendToUsers(await teamCoachesToNotify(input.opponentTeamId, "notifyScore"), {
        title: "Score à valider",
        body: `${input.submittedByTeamName} a saisi le score final. Scannez son QR code pour le valider.`,
        url: `/coach/matches/${input.matchId}`,
        tag: `score-${input.matchId}`,
      });
    })(),
  );
}
