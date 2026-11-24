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

// Network-Only fetch handler: bypass media, range requests, and API/uploads so audio streaming works reliably
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    request.headers.has('range') ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/branding/') ||
    url.pathname.startsWith('/assets/')
  ) {
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' }).catch(() => {
      return fetch(request);
    })
  );
});
