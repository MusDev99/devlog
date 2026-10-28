/**
 * Pure routing rules for sw.js (no caches, no fetch), loaded with importScripts and unit-tested
 * in tests/sw-policy.test.ts. Notes live in IndexedDB on the device, never in a cache.
 */
self.swPolicy = {
  /** @returns {'network-only' | 'network-first' | 'cache-first'} */
  strategyFor(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return 'network-only';
    if (url.pathname.startsWith('/api/')) return 'network-only';
    if (request.mode === 'navigate') return 'network-first';
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) return 'cache-first';
    return 'network-first';
  },
};
