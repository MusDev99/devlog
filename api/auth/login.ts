import { buildAuthUrl, cookie, createOAuthCookie, OAUTH_COOKIE, OAUTH_TTL_SECONDS, pkceChallenge, randomToken, readAuthConfig, redirectUri } from '../_lib/auth';
import { createLimiter } from '../_lib/limiter';

/** GET /api/auth/login → Google consent screen. State, nonce and PKCE verifier ride in a signed, short-lived cookie. */
const limiter = createLimiter(20, 60_000);

export async function GET(request: Request): Promise<Response> {
  const cfg = readAuthConfig(process.env);
  if (!cfg.configured) return new Response('Sign-in is not set up', { status: 503 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!limiter(ip, Date.now())) return new Response('Too many attempts, try again in a minute', { status: 429 });

  const oauth = { state: randomToken(), nonce: randomToken(), verifier: randomToken(48) };
  const url = buildAuthUrl({
    clientId: cfg.clientId,
    redirectUri: redirectUri(cfg),
    state: oauth.state,
    nonce: oauth.nonce,
    challenge: await pkceChallenge(oauth.verifier),
  });
  const headers = new Headers({ location: url, 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(OAUTH_COOKIE, await createOAuthCookie(cfg.secret, oauth, Date.now()), OAUTH_TTL_SECONDS, cfg.appUrl.startsWith('https:')));
  return new Response(null, { status: 302, headers });
}
