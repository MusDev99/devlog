/**
 * Post-deploy checks for `npm run smoke -- <url>`. Pure over an injected fetch so tests run without a network.
 * They check the headers, the PWA files, and that the sign-in API refuses anonymous calls (503 before it is set up).
 */

export type Check = { name: string; ok: boolean; detail: string };
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const header = (res: Response, name: string) => res.headers.get(name) ?? '';

export async function runSmoke(base: string, fetchFn: Fetch): Promise<Check[]> {
  const url = (path: string) => new URL(path, base).toString();
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

  await check('session refuses anonymous', async () => {
    const res = await fetchFn(url('/api/auth/session'));
    return [(res.status === 401 || res.status === 503) && header(res, 'cache-control').includes('no-store'), String(res.status)];
  });

  return checks;
}
