import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createOAuthCookie,
  createSession,
  getCookie,
  isSameOrigin,
  pkceChallenge,
  readAuthConfig,
  readOAuthCookie,
  readSession,
  SESSION_TTL_SECONDS,
  toB64u,
  verifyIdToken,
  type Jwks,
} from '../api/_lib/auth.ts';
import { createLimiter } from '../api/_lib/limiter.ts';

const SECRET = 'x'.repeat(32);
const NOW = Date.UTC(2026, 9, 28, 1, 0, 0);
const enc = new TextEncoder();

const env = {
  AUTH_SECRET: SECRET,
  GOOGLE_CLIENT_ID: 'client.apps.example',
  GOOGLE_CLIENT_SECRET: 'shh',
  APP_URL: 'https://devlog.example.app/',
  ALLOWED_EMAILS: ' Me@Example.com , ,other@example.com',
};

test('config: fail closed unless every variable is set', () => {
  const cfg = readAuthConfig(env);
  assert.equal(cfg.configured, true);
  assert.equal(cfg.appUrl, 'https://devlog.example.app');
  assert.deepEqual(cfg.allowedEmails, ['me@example.com', 'other@example.com']);
  for (const key of Object.keys(env)) assert.equal(readAuthConfig({ ...env, [key]: '' }).configured, false, key);
  assert.equal(readAuthConfig({ ...env, AUTH_SECRET: 'short' }).configured, false);
  assert.equal(readAuthConfig({ ...env, APP_URL: 'devlog.example.app' }).configured, false);
});

test('session cookie: round trip, expiry, tampering, wrong secret', async () => {
  const token = await createSession(SECRET, 'me@example.com', NOW);
  assert.equal(await readSession(token, SECRET, NOW), 'me@example.com');
  assert.equal(await readSession(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000), null);
  assert.equal(await readSession(token, 'y'.repeat(32), NOW), null);
  const [payload, mac] = token.split('.');
  const forged = toB64u(enc.encode(JSON.stringify({ email: 'evil@example.com', typ: 's', exp: 9e9 })));
  assert.equal(await readSession(`${forged}.${mac}`, SECRET, NOW), null);
  assert.equal(await readSession(`${payload}.`, SECRET, NOW), null);
  assert.equal(await readSession(undefined, SECRET, NOW), null);
  assert.equal(await readSession(token, '', NOW), null);
});

test('oauth cookie cannot be replayed as a session (and back)', async () => {
  const oauth = await createOAuthCookie(SECRET, { state: 's', nonce: 'n', verifier: 'v' }, NOW);
  assert.deepEqual(await readOAuthCookie(oauth, SECRET, NOW), { state: 's', nonce: 'n', verifier: 'v' });
  assert.equal(await readSession(oauth, SECRET, NOW), null);
  assert.equal(await readOAuthCookie(await createSession(SECRET, 'me@example.com', NOW), SECRET, NOW), null);
  assert.equal(await readOAuthCookie(oauth, SECRET, NOW + 11 * 60_000), null);
});

test('pkce: RFC 7636 appendix B vector', async () => {
  assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

async function makeIdToken(claims: Record<string, unknown>, opts: { alg?: string; kid?: string } = {}) {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const jwks: Jwks = { keys: [{ ...jwk, kid: 'k1' }] };
  const sign = async (c: Record<string, unknown>) => {
    const h = toB64u(enc.encode(JSON.stringify({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'k1' })));
    const p = toB64u(enc.encode(JSON.stringify(c)));
    const s = toB64u(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, enc.encode(`${h}.${p}`))));
    return `${h}.${p}.${s}`;
  };
  return { jwks, token: await sign(claims), sign };
}

test('id token: accepts a valid Google token and rejects each broken check', async () => {
  const good = {
    iss: 'https://accounts.google.com',
    aud: 'client.apps.example',
    exp: NOW / 1000 + 300,
    nonce: 'n1',
    sub: '123',
    email: 'Me@Example.com',
    email_verified: true,
  };
  const expect = { audience: 'client.apps.example', nonce: 'n1', nowMs: NOW };
  const { jwks, token, sign } = await makeIdToken(good);
  assert.deepEqual(await verifyIdToken(token, jwks, expect), { ok: true, sub: '123', email: 'me@example.com' });

  const reason = async (t: string) => {
    const r = await verifyIdToken(t, jwks, expect);
    return r.ok ? 'ok' : r.reason;
  };
  assert.equal(await reason(await sign({ ...good, iss: 'https://evil.example' })), 'iss');
  assert.equal(await reason(await sign({ ...good, aud: 'other' })), 'aud');
  assert.equal(await reason(await sign({ ...good, exp: NOW / 1000 - 1 })), 'exp');
  assert.equal(await reason(await sign({ ...good, nonce: 'n2' })), 'nonce');
  assert.equal(await reason(await sign({ ...good, email_verified: false })), 'email_unverified');
  const [h, , s] = token.split('.');
  const swapped = toB64u(enc.encode(JSON.stringify({ ...good, email: 'evil@example.com' })));
  assert.equal(await reason(`${h}.${swapped}.${s}`), 'signature');
  assert.equal(await reason('not-a-jwt'), 'malformed');
  assert.equal(await reason((await makeIdToken(good, { alg: 'none' })).token), 'alg');
  assert.equal(await reason((await makeIdToken(good, { kid: 'k9' })).token), 'kid');
});

test('cookies and same-origin check', () => {
  const req = (headers: Record<string, string>) => new Request('https://devlog.example.app/api/standup', { method: 'POST', headers });
  assert.equal(getCookie(req({ cookie: 'a=1; devlog_session=abc.def=; b=2' }), 'devlog_session'), 'abc.def=');
  assert.equal(getCookie(req({ cookie: 'a=1' }), 'devlog_session'), undefined);
  const app = 'https://devlog.example.app';
  assert.equal(isSameOrigin(req({ 'sec-fetch-site': 'same-origin' }), app), true);
  assert.equal(isSameOrigin(req({ 'sec-fetch-site': 'cross-site', origin: app }), app), false);
  assert.equal(isSameOrigin(req({ origin: app }), app), true);
  assert.equal(isSameOrigin(req({ origin: 'https://evil.example' }), app), false);
  assert.equal(isSameOrigin(req({}), app), false);
});

test('limiter: fixed window per key', () => {
  const allow = createLimiter(2, 60_000);
  assert.deepEqual([allow('a', 0), allow('a', 1), allow('a', 2), allow('b', 3)], [true, true, false, true]);
  assert.equal(allow('a', 60_000), true);
});
