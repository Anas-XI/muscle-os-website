// Muscle OS Tools — Offline-First Service Worker (v4.2.0 Modular Architecture)
const CACHE_NAME = 'mos-tools-v4.2.0';
const ASSETS = [
  './muscle_os_app.html',
  './training_tool.html',
  './tdee_adaptive_engine.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/base.css',
  './css/components.css',
  './css/hub.css',
  './css/training.css',
  './css/nutrition.css',
  './js/services/storage.js',
  './js/services/toast.js',
  './js/services/modal.js',
  './js/services/auth.js',
  './js/services/streak.js',
  './js/core/training-engine.js',
  './js/core/tdee-engine.js',
  './js/controllers/hub-app.js',
  './js/controllers/training-app.js',
  './js/controllers/nutrition-app.js',
  '../assets/data/food-database.json',
  '../assets/js/decision-engine.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map(url => new Request(url, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[MOS Tools SW] Partial modular install:', err))
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

  // Network-First for HTML and JSON datasets
  if (req.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        return caches.match(req).then((cached) => cached || caches.match('./muscle_os_app.html'));
      })
    );
    return;
  }

  // Cache-First for static assets (CSS, JS, images, icons)
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

// BackgroundSync for reliable offline workout session & measurement sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'mos-sync-queue') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'MOS_SYNC_TRIGGER' });
        });
      })
    );
  }
});
