// SERVICE WORKER v2.0 — PUSH NOTIFICATIONS + CACHE DISABLED FOR FORCE SYNC
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      for (let name of names) caches.delete(name);
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  return fetch(event.request);
});

// Réception d'une notification push
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'FootCoach';
  const options = {
    body:    data.body  || '',
    icon:    data.icon  || '/icons/icon-192x192.png',
    badge:   '/icons/icon-192x192.png',
    tag:     data.tag   || 'footcoach-event',
    data:    { url: data.url || '/events' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open',    title: 'Voir' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/events';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
