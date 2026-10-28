/**
 * Service worker: installable app that launches offline.
 *   navigations + other same-origin GETs → network first, cached shell as fallback
 *   /assets/* (content-hashed) and /icons/* → cache first
 *   /api/*, non-GET, other origins → never cached
 * RELEASE: bump VERSION when the caching rules change (asset changes are picked up via sw-assets.json).
 */
importScripts('/sw-policy.js');

const VERSION = 'v1';
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
      await self.skipWaiting();
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

self.addEventListener('fetch', (event) => {
  const strategy = self.swPolicy.strategyFor(event.request);
  if (strategy === 'network-only') return;
  event.respondWith(strategy === 'cache-first' ? cacheFirst(event.request) : networkFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
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
    const cached = await caches.match(request.mode === 'navigate' ? '/' : request);
    if (cached) return cached;
    throw error;
  }
}
