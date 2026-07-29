const CACHE_NAME = 'webnook-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  // Bypass non-GET, non-HTTP/S, and backend endpoints
  if (
    req.method !== 'GET' ||
    (!url.startsWith('http://') && !url.startsWith('https://')) ||
    url.includes('/api/') ||
    url.includes('/uploads/') ||
    url.includes('/branding/')
  ) {
    return;
  }

  const isNavigation = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    // Network-First strategy for HTML / Page Navigations
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline, fall back to cached entry point
          return caches.match(req).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Network-First strategy for static JS/CSS build assets to prevent stale cache mismatches
  if (url.includes('/assets/')) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const contentType = networkResponse.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            // HTML returned for JS/CSS asset means 404 SPA fallback - do not cache
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache)).catch(() => {});
          return networkResponse;
        })
        .catch(() => {
          return caches.match(req);
        })
    );
    return;
  }

  // Stale-While-Revalidate for other static resources
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache)).catch(() => {});
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
