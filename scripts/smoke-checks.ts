/**
 * Post-deploy checks for `npm run smoke -- <url>`. Pure over an injected fetch so tests run without a network.
 * They prove the deploy is safe whether or not sign-in is configured: every "AI off" answer (503) also passes.
 */

export type Check = { name: string; ok: boolean; detail: string };
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const header = (res: Response, name: string) => res.headers.get(name) ?? '';

export async function runSmoke(base: string, fetchFn: Fetch): Promise<Check[]> {
  const url = (path: string) => new URL(path, base).toString();
  const origin = new URL(base).origin;
  const checks: Check[] = [];
  const check = async (name: string, run: () => Promise<[boolean, string]>) => {
    try {
      const [ok, detail] = await run();
      checks.push({ name, ok, detail });
    } catch (error) {
      checks.push({ name, ok: false, detail: error instanceof Error ? error.message : 'request failed' });
    }
  };

  await check('home page + security headers', async () => {
    const res = await fetchFn(url('/'));
    const missing = [
      header(res, 'content-security-policy').includes("default-src 'self'") ? '' : 'CSP',
      header(res, 'x-content-type-options') === 'nosniff' ? '' : 'nosniff',
      header(res, 'strict-transport-security') ? '' : 'HSTS',
      header(res, 'referrer-policy') ? '' : 'Referrer-Policy',
    ].filter(Boolean);
    return [res.status === 200 && missing.length === 0, `${res.status}${missing.length ? `, missing ${missing.join(', ')}` : ''}`];
  });

  await check('PWA files', async () => {
    const [manifest, sw] = await Promise.all([fetchFn(url('/manifest.webmanifest')), fetchFn(url('/sw.js'))]);
    return [manifest.status === 200 && sw.status === 200 && header(sw, 'cache-control').includes('no-cache'), `manifest ${manifest.status}, sw ${sw.status}`];
  });

  await check('session without cookie is refused', async () => {
    const res = await fetchFn(url('/api/auth/session'));
    return [(res.status === 401 || res.status === 503) && header(res, 'cache-control').includes('no-store'), String(res.status)];
  });

  await check('standup refuses cross-site requests', async () => {
    const res = await fetchFn(url('/api/standup'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: '{"notes":[]}',
    });
    return [res.status === 403 || res.status === 503, String(res.status)];
  });

  await check('standup refuses requests without a session', async () => {
    const res = await fetchFn(url('/api/standup'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: '{"notes":[]}',
    });
    // 403 too: on a preview URL the origin is not APP_URL, which is refused before the session check.
    return [[401, 403, 503].includes(res.status), String(res.status)];
  });

  await check('sign-in redirects to Google with PKCE', async () => {
    const res = await fetchFn(url('/api/auth/login'), { redirect: 'manual' });
    if (res.status === 503) return [true, '503 (sign-in not configured, AI off)'];
    const to = header(res, 'location');
    const cookie = header(res, 'set-cookie');
    const ok =
      res.status === 302 &&
      to.startsWith('https://accounts.google.com/') &&
      to.includes('code_challenge_method=S256') &&
      /HttpOnly/i.test(cookie) &&
      /Secure/i.test(cookie);
    return [ok, `${res.status} → ${to.split('?')[0] || 'no location'}`];
  });

  return checks;
}
