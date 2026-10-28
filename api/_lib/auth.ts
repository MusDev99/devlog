/**
 * Google sign-in (OIDC authorization code + PKCE) and signed session cookies, adapted from WorkForce.
 * Web Crypto only and no relative imports: Vercel bundles it as is and `node --test` runs it directly.
 * Network calls live in the route handlers, not here.
 */

export const SESSION_COOKIE = 'devlog_session';
export const OAUTH_COOKIE = 'devlog_oauth';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days: a daily-use phone app
export const OAUTH_TTL_SECONDS = 60 * 10;

/** Fixed Google hosts only (OWASP A10): nothing here comes from env or the request. */
export const GOOGLE = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  jwks: 'https://www.googleapis.com/oauth2/v3/certs',
  issuers: ['https://accounts.google.com', 'accounts.google.com'],
} as const;

const enc = new TextEncoder();
const dec = new TextDecoder();

export type AuthConfig = {
  configured: boolean;
  secret: string;
  clientId: string;
  clientSecret: string;
  /** Public origin, no trailing slash. Fixed from env, never from the Host header. */
  appUrl: string;
  /** Lowercased emails allowed to use the AI. Empty = nobody (fail closed). */
  allowedEmails: string[];
};

export function readAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const secret = env.AUTH_SECRET ?? '';
  const clientId = env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET ?? '';
  const appUrl = (env.APP_URL ?? '').trim().replace(/\/+$/, '');
  const allowedEmails = (env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return {
    configured: secret.length >= 32 && !!clientId && !!clientSecret && /^https?:\/\//.test(appUrl) && allowedEmails.length > 0,
    secret,
    clientId,
    clientSecret,
    appUrl,
    allowedEmails,
  };
}

export const redirectUri = (cfg: AuthConfig) => `${cfg.appUrl}/api/auth/callback`;

export function toB64u(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64u(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export const randomToken = (bytes = 32) => toB64u(crypto.getRandomValues(new Uint8Array(bytes)));

/** RFC 7636 S256 challenge. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return toB64u(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier))));
}

export function buildAuthUrl(p: { clientId: string; redirectUri: string; state: string; nonce: string; challenge: string }): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: 'code',
    scope: 'openid email',
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${GOOGLE.auth}?${q}`;
}

export type Jwks = { keys: Array<JsonWebKey & { kid?: string }> };
export type IdTokenResult = { ok: true; sub: string; email: string } | { ok: false; reason: string };

/** Verifies the RS256 signature via JWKS, then iss / aud / exp / nonce / email_verified. */
export async function verifyIdToken(
  token: string,
  jwks: Jwks,
  expect: { audience: string; nonce: string; nowMs: number },
): Promise<IdTokenResult> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return { ok: false, reason: 'malformed' };
  try {
    const header = JSON.parse(dec.decode(fromB64u(h))) as { alg?: string; kid?: string };
    if (header.alg !== 'RS256') return { ok: false, reason: 'alg' };
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) return { ok: false, reason: 'kid' };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64u(s), enc.encode(`${h}.${p}`)))) {
      return { ok: false, reason: 'signature' };
    }
    const c = JSON.parse(dec.decode(fromB64u(p))) as Record<string, unknown>;
    const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
    if (typeof c.iss !== 'string' || !(GOOGLE.issuers as readonly string[]).includes(c.iss)) return { ok: false, reason: 'iss' };
    if (!aud.includes(expect.audience)) return { ok: false, reason: 'aud' };
    if (typeof c.exp !== 'number' || c.exp * 1000 <= expect.nowMs) return { ok: false, reason: 'exp' };
    if (c.nonce !== expect.nonce) return { ok: false, reason: 'nonce' };
    if (typeof c.sub !== 'string' || typeof c.email !== 'string') return { ok: false, reason: 'claims' };
    if (c.email_verified !== true && c.email_verified !== 'true') return { ok: false, reason: 'email_unverified' };
    return { ok: true, sub: c.sub, email: c.email.toLowerCase() };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

type Typ = 's' | 'o';

/** `<b64u(json)>.<hmac>`; `typ` is signed so an OAuth cookie can never be replayed as a session. */
async function sign(secret: string, typ: Typ, body: Record<string, string>, ttl: number, nowMs: number): Promise<string> {
  const payload = toB64u(enc.encode(JSON.stringify({ ...body, typ, exp: Math.floor(nowMs / 1000) + ttl })));
  return `${payload}.${toB64u(await hmac(secret, payload))}`;
}

async function verify(token: string | undefined, secret: string, typ: Typ, nowMs: number): Promise<Record<string, unknown> | null> {
  const [payload, mac] = (token ?? '').split('.');
  if (!payload || !mac || !secret) return null;
  try {
    if (!sameBytes(enc.encode(mac), enc.encode(toB64u(await hmac(secret, payload))))) return null;
    const body = JSON.parse(dec.decode(fromB64u(payload))) as Record<string, unknown>;
    return body.typ === typ && typeof body.exp === 'number' && body.exp * 1000 > nowMs ? body : null;
  } catch {
    return null;
  }
}

export const createSession = (secret: string, email: string, nowMs: number) => sign(secret, 's', { email }, SESSION_TTL_SECONDS, nowMs);

export async function readSession(token: string | undefined, secret: string, nowMs: number): Promise<string | null> {
  const body = await verify(token, secret, 's', nowMs);
  return body && typeof body.email === 'string' ? body.email : null;
}

export type OAuthState = { state: string; nonce: string; verifier: string };

export const createOAuthCookie = (secret: string, s: OAuthState, nowMs: number) => sign(secret, 'o', s, OAUTH_TTL_SECONDS, nowMs);

export async function readOAuthCookie(token: string | undefined, secret: string, nowMs: number): Promise<OAuthState | null> {
  const b = await verify(token, secret, 'o', nowMs);
  return b && typeof b.state === 'string' && typeof b.nonce === 'string' && typeof b.verifier === 'string'
    ? { state: b.state, nonce: b.nonce, verifier: b.verifier }
    : null;
}

export function getCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

export function cookie(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/** CSRF defence for cookie-authenticated POSTs: the browser must say the request is same-origin. */
export function isSameOrigin(request: Request, appUrl: string): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  return origin !== null && origin === appUrl;
}
