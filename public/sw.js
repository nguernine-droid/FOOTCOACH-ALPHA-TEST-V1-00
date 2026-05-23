// SERVICE WORKER - CACHE DISABLED FOR FORCE SYNC
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
