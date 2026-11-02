/**
 * Service worker: installable app that launches offline.
 *   navigations + other same-origin GETs → network first, cached shell as fallback
 *   /assets/* (content-hashed) and /icons/* → cache first
 *   /api/*, non-GET, other origins → never cached
 * Updates: a new version installs in the background and waits; the app shows "Update ready" and
 * posts 'skip-waiting' when the person taps Reload, so nothing swaps under them mid-task.
 * RELEASE: bump VERSION when the caching rules change (asset changes are picked up via sw-assets.json).
 */
importScripts('/sw-policy.js');

const VERSION = 'v2';
const CACHE = `devlog-${VERSION}`;
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = await fetch('/sw-assets.json', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);
      await cache.addAll([...SHELL, ...assets]);
      // First install: nothing to replace, take over at once. Later versions wait for the app's go-ahead.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('devlog-') && key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const strategy = self.swPolicy.strategyFor(event.request);
  if (strategy === 'network-only') return;
  event.respondWith(strategy === 'cache-first' ? cacheFirst(event.request) : networkFirst(event.request));
});

/**
 * Vite loads the hashed JS and CSS with `crossorigin`, so those requests carry an Origin header while the
 * cached responses say `Vary: Origin`. A plain match then misses and the app opens blank offline.
 * Hashed files and the shell never differ by origin (same-origin only, see sw-policy.js), so Vary is ignored.
 */
const MATCH = { ignoreVary: true };

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.mode === 'navigate') (await caches.open(CACHE)).put('/', response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request.mode === 'navigate' ? '/' : request, MATCH);
    if (cached) return cached;
    throw error;
  }
}
