// Increment version string to force cache refresh on update
const CACHE = 'projis-v27';

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

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  const cache = await caches.open(CACHE);
  cache.put(request, fresh.clone());
  return fresh;
}

// Fetch strategy:
// - Navigations and app scripts use network-first to avoid stale deployments
// - Everything else uses cache-first for speed/offline support
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppScript = isSameOrigin && url.pathname.includes('/projis/js/');

  if (e.request.mode === 'navigate' || isAppScript) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  e.respondWith(cacheFirst(e.request));
});
