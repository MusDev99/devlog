import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSmoke } from '../scripts/smoke-checks.ts';

const SECURITY = {
  'content-security-policy': "default-src 'self'",
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=63072000',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

/** A fake deploy: `signIn` true = fully configured, false = AI off (503s). */
function fakeDeploy(signIn: boolean, overrides: Record<string, () => Response> = {}) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const path = new URL(url).pathname;
    const origin = new Headers(init?.headers).get('origin');
    const routes: Record<string, () => Response> = {
      '/': () => new Response('<html>', { headers: SECURITY }),
      '/manifest.webmanifest': () => new Response('{}'),
      '/sw.js': () => new Response('', { headers: { 'cache-control': 'no-cache' } }),
      '/api/auth/session': () => new Response('{}', { status: signIn ? 401 : 503, headers: { 'cache-control': 'no-store' } }),
      '/api/standup': () => new Response('{}', { status: !signIn ? 503 : origin === 'https://devlog.test' ? 401 : 403 }),
      '/api/auth/login': () =>
        signIn
          ? new Response(null, {
              status: 302,
              headers: {
                location: 'https://accounts.google.com/o/oauth2/v2/auth?code_challenge_method=S256',
                'set-cookie': 'devlog_oauth=x; Path=/; HttpOnly; SameSite=Lax; Secure',
              },
            })
          : new Response('', { status: 503 }),
      ...overrides,
    };
    return (routes[path] ?? (() => new Response('', { status: 404 })))();
  };
}

test('smoke: passes a configured deploy and an AI-off deploy', async () => {
  for (const signIn of [true, false]) {
    const checks = await runSmoke('https://devlog.test', fakeDeploy(signIn));
    assert.deepEqual(checks.filter((c) => !c.ok), [], `signIn=${signIn}`);
    assert.equal(checks.length, 6);
  }
});

test('smoke: catches missing headers, an open standup and an unsafe login', async () => {
  const checks = await runSmoke(
    'https://devlog.test',
    fakeDeploy(true, {
      '/': () => new Response('<html>'),
      '/api/standup': () => new Response('{}', { status: 200 }),
      '/api/auth/login': () => new Response(null, { status: 302, headers: { location: 'https://evil.example/' } }),
    }),
  );
  assert.deepEqual(
    checks.filter((c) => !c.ok).map((c) => c.name),
    [
      'home page + security headers',
      'standup refuses cross-site requests',
      'standup refuses requests without a session',
      'sign-in redirects to Google with PKCE',
    ],
  );
  assert.match(checks[0]?.detail ?? '', /missing CSP, nosniff, HSTS, Referrer-Policy/);
});

test('smoke: a network error is a failed check, not a crash', async () => {
  const checks = await runSmoke('https://devlog.test', async () => {
    throw new Error('getaddrinfo ENOTFOUND');
  });
  assert.equal(checks.every((c) => !c.ok && c.detail === 'getaddrinfo ENOTFOUND'), true);
});
