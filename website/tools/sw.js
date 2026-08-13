// Muscle OS Tools & Training App — service worker (Network-first for HTML/JSON, Cache-first for assets)
const CACHE_NAME = 'mos-tools-v4.0.0';
const ASSETS = [
  './training_tool.html',
  './tdee_adaptive_engine.html',
  '../assets/data/food-database.json',
  './manifest.json',
  './update_notifier.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notify open clients that a new version is active and trigger reload
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'NEW_VERSION_AVAILABLE',
            message: 'v3.1.0 is live! Enhanced Welcome Back Matrix active.',
            forceReload: true
          });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-First for HTML pages and JSON datasets (guarantees latest features online)
  if (req.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req).then((networkRes) => {
        if (networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => {
        return caches.match(req).then((cached) => cached || caches.match('./tdee_adaptive_engine.html'));
      })
    );
    return;
  }

  // Cache-First for static assets (images, icons, fonts)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
