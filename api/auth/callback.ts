import {
  cookie,
  createSession,
  getCookie,
  GOOGLE,
  OAUTH_COOKIE,
  readAuthConfig,
  readOAuthCookie,
  redirectUri,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyIdToken,
  type Jwks,
} from '../_lib/auth';
import { createLimiter } from '../_lib/limiter';

/**
 * GET /api/auth/callback: checks state, exchanges the code (PKCE), verifies the ID token and the allow-list,
 * then sets the session. The app only learns "ok" or "denied" (A07: no hint about which check failed).
 */
const limiter = createLimiter(20, 60_000);

export async function GET(request: Request): Promise<Response> {
  const cfg = readAuthConfig(process.env);
  if (!cfg.configured) return new Response('Sign-in is not set up', { status: 503 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!limiter(ip, Date.now())) return new Response('Too many attempts, try again in a minute', { status: 429 });

  const secure = cfg.appUrl.startsWith('https:');
  const done = (result: 'ok' | 'denied', session?: string) => {
    const headers = new Headers({ location: `${cfg.appUrl}/?signin=${result}`, 'cache-control': 'no-store' });
    headers.append('set-cookie', cookie(OAUTH_COOKIE, '', 0, secure));
    if (session) headers.append('set-cookie', cookie(SESSION_COOKIE, session, SESSION_TTL_SECONDS, secure));
    return new Response(null, { status: 302, headers });
  };

  const url = new URL(request.url);
  const now = Date.now();
  const oauth = await readOAuthCookie(getCookie(request, OAUTH_COOKIE), cfg.secret, now);
  const code = url.searchParams.get('code');
  if (!oauth || !code || url.searchParams.get('state') !== oauth.state) return done('denied');

  try {
    const tokenRes = await fetch(GOOGLE.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: redirectUri(cfg),
        grant_type: 'authorization_code',
        code_verifier: oauth.verifier,
      }),
    });
    const tokens = (await tokenRes.json()) as { id_token?: unknown };
    if (!tokenRes.ok || typeof tokens.id_token !== 'string') {
      console.error('Token exchange failed', tokenRes.status);
      return done('denied');
    }
    const jwks = (await (await fetch(GOOGLE.jwks)).json()) as Jwks;
    const id = await verifyIdToken(tokens.id_token, jwks, { audience: cfg.clientId, nonce: oauth.nonce, nowMs: now });
    if (!id.ok) {
      console.error('ID token rejected', id.reason);
      return done('denied');
    }
    if (!cfg.allowedEmails.includes(id.email)) return done('denied');
    return done('ok', await createSession(cfg.secret, id.email, now));
  } catch (error) {
    console.error('Sign-in failed', error instanceof Error ? error.name : 'unknown');
    return done('denied');
  }
}
