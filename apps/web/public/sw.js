/* Service worker de FootCoach — notifications uniquement.
 *
 * Volontairement sans cache : mettre l'app hors ligne demanderait une stratégie
 * d'invalidation, et un coach qui voit des annonces périmées vaudrait pire que
 * pas d'offline du tout. Ce fichier ne fait qu'afficher les notifications push
 * et ramener l'app au bon écran quand on les touche.
 */

// Prend la main immédiatement, sans attendre la fermeture des onglets ouverts
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Charge utile illisible : on affiche quand même quelque chose plutôt que rien
  }

  const title = payload.title || "FootCoach";
  const options = {
    body: payload.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    // Deux notifications du même sujet se remplacent au lieu de s'empiler
    tag: payload.tag || "footcoach",
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/coach" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/coach";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // App déjà ouverte : on la ramène au premier plan et on y navigue,
      // plutôt que d'ouvrir une deuxième fenêtre.
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
