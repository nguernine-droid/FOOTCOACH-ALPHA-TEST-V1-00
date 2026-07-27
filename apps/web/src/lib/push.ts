"use client";

import { api } from "@/lib/api";

/**
 * Abonnement aux notifications, côté navigateur.
 *
 * Trois conditions indépendantes doivent être réunies, et l'interface doit
 * pouvoir expliquer laquelle manque :
 *  - le navigateur sait faire (service worker + Push API) ;
 *  - le serveur a une paire VAPID configurée ;
 *  - l'utilisateur a accordé l'autorisation.
 *
 * Sur iOS, la Push API n'existe QUE si l'app a été ajoutée à l'écran d'accueil :
 * `supported` y est donc faux tant qu'on la consulte dans Safari.
 */
export type PushAvailability =
  | { state: "unsupported" }
  | { state: "needs-install" }
  | { state: "not-configured" }
  | { state: "denied" }
  | { state: "ready"; subscribed: boolean };

/** iOS n'expose le push qu'en mode « écran d'accueil » */
function isIosSafariTab(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export function browserSupportsPush(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

async function serverConfig(): Promise<{ enabled: boolean; publicKey: string | null }> {
  try {
    return await api<{ enabled: boolean; publicKey: string | null }>("/push/config");
  } catch {
    return { enabled: false, publicKey: null };
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!browserSupportsPush()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

/** Où en est cet appareil pour ce compte ? */
export async function checkAvailability(): Promise<PushAvailability> {
  if (!browserSupportsPush()) {
    return isIosSafariTab() ? { state: "needs-install" } : { state: "unsupported" };
  }
  const config = await serverConfig();
  if (!config.enabled || !config.publicKey) return { state: "not-configured" };
  if (Notification.permission === "denied") return { state: "denied" };

  const registration = await registerServiceWorker();
  const existing = await registration?.pushManager.getSubscription();
  if (!existing) return { state: "ready", subscribed: false };

  // L'abonnement peut survivre côté navigateur alors que le serveur l'a purgé
  const { subscribed } = await api<{ subscribed: boolean }>(
    `/push/subscription?endpoint=${encodeURIComponent(existing.endpoint)}`,
  ).catch(() => ({ subscribed: false }));
  return { state: "ready", subscribed };
}

/** La clé VAPID voyage en base64url ; PushManager veut un ArrayBuffer. */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

/** Demande l'autorisation puis enregistre cet appareil. */
export async function subscribe(): Promise<PushAvailability> {
  const config = await serverConfig();
  if (!config.enabled || !config.publicKey) return { state: "not-configured" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? { state: "denied" } : { state: "ready", subscribed: false };

  const registration = await registerServiceWorker();
  if (!registration) return { state: "unsupported" };

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      // Exigé par Chrome : pas d'abonnement muet, chaque push affiche quelque chose
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(config.publicKey),
    }));

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  await api("/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return { state: "ready", subscribed: true };
}

/** Désinscrit cet appareil, des deux côtés. */
export async function unsubscribe(): Promise<void> {
  const registration = await registerServiceWorker();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api("/push/subscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}
