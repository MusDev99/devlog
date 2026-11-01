import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSmoke } from '../scripts/smoke-checks.ts';

const SECURITY = {
  'content-security-policy': "default-src 'self'",
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=63072000',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

/** A fake static deploy: unknown paths are 404. */
function fakeDeploy(overrides: Record<string, () => Response> = {}) {
  return async (url: string): Promise<Response> => {
    const routes: Record<string, () => Response> = {
      '/': () => new Response('<html>', { headers: SECURITY }),
      '/manifest.webmanifest': () => new Response('{}'),
      '/sw.js': () => new Response('', { headers: { 'cache-control': 'no-cache' } }),
      ...overrides,
    };
    return (routes[new URL(url).pathname] ?? (() => new Response('', { status: 404 })))();
  };
}

test('smoke: passes a static deploy', async () => {
  const checks = await runSmoke('https://devlog.test', fakeDeploy());
  assert.deepEqual(checks.filter((c) => !c.ok), []);
  assert.equal(checks.length, 3);
});

test('smoke: catches missing headers and a leftover API function', async () => {
  const checks = await runSmoke(
    'https://devlog.test',
    fakeDeploy({
      '/': () => new Response('<html>'),
      '/api/standup': () => new Response('{}', { status: 503 }),
    }),
  );
  assert.deepEqual(
    checks.filter((c) => !c.ok).map((c) => c.name),
    ['home page + security headers', 'no server functions'],
  );
  assert.match(checks[0]?.detail ?? '', /missing CSP, nosniff, HSTS, Referrer-Policy/);
});

test('smoke: a network error is a failed check, not a crash', async () => {
  const checks = await runSmoke('https://devlog.test', async () => {
    throw new Error('getaddrinfo ENOTFOUND');
  });
  assert.equal(checks.every((c) => !c.ok && c.detail === 'getaddrinfo ENOTFOUND'), true);
});
