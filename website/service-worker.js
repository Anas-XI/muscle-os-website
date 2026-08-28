// Muscle OS Omni Hub — Service Worker (v4.1.0 Offline-First + Stale-While-Revalidate)
const CACHE_NAME = 'mos-omni-v4.1.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './tools/muscle_os_app.html',
  './tools/training_tool.html',
  './tools/tdee_adaptive_engine.html',
  './tools/manifest.json',
  './tools/icons/icon-192.png',
  './tools/icons/icon-512.png',
  './assets/data/food-database.json',
  './assets/js/decision-engine.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS.map(url => new Request(url, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[MOS SW] Install caching partial:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cache Google Fonts & CDN resources
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(req).then((cached) => {
          return cached || fetch(req).then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Same origin requests
  if (url.origin === self.location.origin) {
    // Network-First for HTML/JSON (guarantees latest updates while online, fallbacks to cache offline)
    if (req.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.json') || url.pathname.endsWith('.html')) {
      event.respondWith(
        fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        }).catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            if (req.headers.get('accept')?.includes('text/html')) {
              return caches.match('./tools/muscle_os_app.html') || caches.match('./index.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });
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
  }
});
