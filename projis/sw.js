// Increment version string to force cache refresh on update
const CACHE = 'projis-v18';

const ASSETS = [
  '/projis/',
  '/projis/index.html',
  '/projis/manifest.json',
  '/projis/icon.svg',
  '/projis/js/data.js',
  '/projis/js/state.js',
  '/projis/js/compute.js',
  '/projis/js/draw.js',
  '/projis/js/ui.js',
  '/projis/js/app.js',
];

// Install: pre-cache all app assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, fall back to network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
