import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSmoke } from '../scripts/smoke-checks.ts';

const SECURITY = {
  'content-security-policy': "default-src 'self'",
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=63072000',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

/** A fake deploy: static files plus the session endpoint; unknown paths are 404. */
function fakeDeploy(overrides: Record<string, () => Response> = {}) {
  return async (url: string): Promise<Response> => {
    const routes: Record<string, () => Response> = {
      '/': () => new Response('<html>', { headers: SECURITY }),
      '/manifest.webmanifest': () => new Response('{}'),
      '/sw.js': () => new Response('', { headers: { 'cache-control': 'no-cache' } }),
      '/api/auth/session': () => new Response('{}', { status: 401, headers: { 'cache-control': 'no-store' } }),
      ...overrides,
    };
    return (routes[new URL(url).pathname] ?? (() => new Response('', { status: 404 })))();
  };
}

test('smoke: passes a deploy with sign-in set up, and one without (503)', async () => {
  const checks = await runSmoke('https://devlog.test', fakeDeploy());
  assert.deepEqual(checks.filter((c) => !c.ok), []);
  assert.equal(checks.length, 3);
  const off = await runSmoke('https://devlog.test', fakeDeploy({ '/api/auth/session': () => new Response('{}', { status: 503, headers: { 'cache-control': 'no-store' } }) }));
  assert.deepEqual(off.filter((c) => !c.ok), []);
});

test('smoke: catches missing headers and a session endpoint that lets anyone in', async () => {
  const checks = await runSmoke(
    'https://devlog.test',
    fakeDeploy({
      '/': () => new Response('<html>'),
      '/api/auth/session': () => new Response('{"email":"x@y"}', { status: 200 }),
    }),
  );
  assert.deepEqual(
    checks.filter((c) => !c.ok).map((c) => c.name),
    ['home page + security headers', 'session refuses anonymous'],
  );
  assert.match(checks[0]?.detail ?? '', /missing CSP, nosniff, HSTS, Referrer-Policy/);
});

test('smoke: a network error is a failed check, not a crash', async () => {
  const checks = await runSmoke('https://devlog.test', async () => {
    throw new Error('getaddrinfo ENOTFOUND');
  });
  assert.equal(checks.every((c) => !c.ok && c.detail === 'getaddrinfo ENOTFOUND'), true);
});
