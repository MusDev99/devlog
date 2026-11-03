import { cookie, getCookie, isAllowed, isSameOrigin, readAuthConfig, readSession, SESSION_COOKIE } from '../_lib/auth.js';

const json = (status: number, body: unknown, setCookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' });
  if (setCookie) headers.append('set-cookie', setCookie);
  return new Response(JSON.stringify(body), { status, headers });
};

/** GET /api/auth/session → who is signed in (still allowed), or 401. 503 when sign-in is not set up. */
export async function GET(request: Request): Promise<Response> {
  const cfg = readAuthConfig(process.env);
  if (!cfg.configured) return json(503, { error: 'unavailable' });
  const user = await readSession(getCookie(request, SESSION_COOKIE), cfg.secret, Date.now());
  return user && isAllowed(cfg, user.email) ? json(200, user) : json(401, { error: 'signed_out' });
}

/** DELETE /api/auth/session → sign out. */
export async function DELETE(request: Request): Promise<Response> {
  const cfg = readAuthConfig(process.env);
  if (!isSameOrigin(request, cfg.appUrl)) return json(403, { error: 'forbidden' });
  return json(200, { ok: true }, cookie(SESSION_COOKIE, '', 0, cfg.appUrl.startsWith('https:')));
}
