/**
 * POST /api/tasks: the device sends tasks that changed since its last sync; they become rows in the
 * Tasks tab. Everything it needs is injected (no relative imports), so tests run it without Google.
 */

export const MAX_TASKS = 50;
export const MAX_BYTES = 64_000;

export type TaskSyncDeps<T> = {
  configured: boolean;
  sheetConfigured: boolean;
  isSameOrigin: (request: Request) => boolean;
  readUser: (request: Request) => Promise<{ email: string } | null>;
  allow: (key: string, nowMs: number) => boolean;
  isTask: (value: unknown) => value is T;
  row: (task: T, email: string, nowMs: number) => string[];
  write: (email: string, rows: string[][], deletes: { id: string; at: string }[]) => Promise<Record<string, number>>;
  now: () => number;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const isDelete = (v: unknown): v is { id: string; at: string } =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as { id?: unknown }).id === 'string' &&
  (v as { id: string }).id.length <= 100 &&
  typeof (v as { at?: unknown }).at === 'string' &&
  Number.isFinite(Date.parse((v as { at: string }).at));

export async function handleTaskSync<T>(request: Request, deps: TaskSyncDeps<T>): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  if (!deps.configured) return json(503, { error: 'unavailable' });
  // CSRF: a cookie-authenticated write must come from the app itself.
  if (!deps.isSameOrigin(request)) return json(403, { error: 'forbidden' });
  const user = await deps.readUser(request);
  if (!user) return json(401, { error: 'signed_out' });
  const now = deps.now();
  if (!deps.allow(user.email, now)) return json(429, { error: 'busy' });
  if (!deps.sheetConfigured) return json(503, { error: 'sheet_unavailable' });

  const text = await request.text();
  if (text.length > MAX_BYTES) return json(413, { error: 'too_large' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: 'json' });
  }
  const { upserts = [], deletes = [] } = (body ?? {}) as { upserts?: unknown; deletes?: unknown };
  if (!Array.isArray(upserts) || !Array.isArray(deletes)) return json(400, { error: 'shape' });
  if (upserts.length + deletes.length > MAX_TASKS) return json(413, { error: 'too_many' });
  if (!upserts.every(deps.isTask) || !deletes.every(isDelete)) return json(400, { error: 'invalid' });

  try {
    const result = await deps.write(
      user.email,
      upserts.map((t) => deps.row(t, user.email, now)),
      deletes,
    );
    return json(200, { ok: true, ...result });
  } catch (error) {
    console.error('Tasks sheet write failed', error instanceof Error ? error.message : 'unknown');
    return json(502, { error: 'sheet_error' });
  }
}
