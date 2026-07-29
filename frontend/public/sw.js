// WebNook Zero-Caching Service Worker (Enforces 100% fresh network fetches on every request)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Network-Only fetch handler: always fetch fresh from network with no-store control
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => {
      return fetch(event.request);
    })
  );
});
