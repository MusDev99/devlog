/**
 * /api/settings: a person's daily targets, kept in their Users row so they follow them to every device.
 * Everything it needs is injected (no relative imports), so tests run it without Google.
 */

export type SettingsDeps<T> = {
  configured: boolean;
  sheetConfigured: boolean;
  isSameOrigin: (request: Request) => boolean;
  readUser: (request: Request) => Promise<{ email: string } | null>;
  allow: (key: string, nowMs: number) => boolean;
  /** Validation and cell mapping (src/lib/targets.ts). */
  isValid: (value: unknown) => value is T;
  fromCells: (cells: string[]) => T | null;
  toCells: (value: T) => string[];
  read: (email: string) => Promise<string[] | null>;
  write: (email: string, cells: string[]) => Promise<boolean>;
  now: () => number;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function handleSettings<T>(request: Request, deps: SettingsDeps<T>): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'PUT') return json(405, { error: 'method' });
  if (!deps.configured) return json(503, { error: 'unavailable' });
  if (request.method === 'PUT' && !deps.isSameOrigin(request)) return json(403, { error: 'forbidden' });
  const user = await deps.readUser(request);
  if (!user) return json(401, { error: 'signed_out' });
  if (!deps.allow(user.email, deps.now())) return json(429, { error: 'busy' });
  if (!deps.sheetConfigured) return json(503, { error: 'sheet_unavailable' });

  try {
    if (request.method === 'GET') {
      const cells = await deps.read(user.email);
      return json(200, { targets: cells ? deps.fromCells(cells) : null });
    }
    const text = await request.text();
    if (text.length > 1_000) return json(413, { error: 'too_large' });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { error: 'json' });
    }
    const targets = (body as { targets?: unknown } | null)?.targets;
    if (!deps.isValid(targets)) return json(400, { error: 'invalid' });
    return (await deps.write(user.email, deps.toCells(targets))) ? json(200, { ok: true, targets }) : json(404, { error: 'not_registered' });
  } catch (error) {
    console.error('Settings sheet call failed', error instanceof Error ? error.message : 'unknown');
    return json(502, { error: 'sheet_error' });
  }
}
