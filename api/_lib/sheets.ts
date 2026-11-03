/**
 * Google Sheets over REST as a service account. Web Crypto only, no npm dependency, no relative imports
 * (Vercel bundles it as is and `node --test` runs it directly). `fetch` and the clock are injected for tests.
 * Values are always written RAW: text that looks like a formula (`=IMPORTXML(…)`) stays text (OWASP A03).
 */

/** Fixed Google hosts only (OWASP A10): nothing here comes from env or the request. */
export const SHEETS = {
  token: 'https://oauth2.googleapis.com/token',
  api: 'https://sheets.googleapis.com/v4/spreadsheets',
  scope: 'https://www.googleapis.com/auth/spreadsheets',
} as const;

export type SheetsConfig = { configured: boolean; clientEmail: string; privateKey: string; sheetId: string };

export function readSheetsConfig(env: Record<string, string | undefined>): SheetsConfig {
  const clientEmail = (env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '').trim();
  // Vercel and .env files often keep the key on one line with literal "\n".
  const privateKey = (env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n').trim();
  const sheetId = (env.SHEET_ID ?? '').trim();
  return {
    configured: clientEmail.includes('@') && privateKey.includes('PRIVATE KEY') && /^[\w-]{20,}$/.test(sheetId),
    clientEmail,
    privateKey,
    sheetId,
  };
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Rows = string[][];

const enc = new TextEncoder();
const b64u = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64uJson = (value: unknown) => b64u(enc.encode(JSON.stringify(value)));

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

/** RS256 JWT a service account trades for an access token (RFC 7523). */
export async function serviceJwt(cfg: SheetsConfig, nowMs: number): Promise<string> {
  const iat = Math.floor(nowMs / 1000);
  const unsigned = `${b64uJson({ alg: 'RS256', typ: 'JWT' })}.${b64uJson({ iss: cfg.clientEmail, scope: SHEETS.scope, aud: SHEETS.token, iat, exp: iat + 3600 })}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(cfg.privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return `${unsigned}.${b64u(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned))))}`;
}

export type Sheets = {
  getValues: (range: string) => Promise<Rows>;
  append: (tab: string, rows: Rows) => Promise<void>;
  batchUpdate: (data: { range: string; values: Rows }[]) => Promise<void>;
  ensureTab: (tab: string, headers: string[]) => Promise<void>;
};

/** A client bound to one spreadsheet. The access token is cached until a minute before it expires. */
export function createSheets(cfg: SheetsConfig, fetchFn: Fetch = fetch, now: () => number = Date.now): Sheets {
  let token: { value: string; until: number } | null = null;
  const ready = new Set<string>();

  async function accessToken(): Promise<string> {
    if (token && token.until > now()) return token.value;
    const res = await fetchFn(SHEETS.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await serviceJwt(cfg, now()) }),
    });
    const body = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
    if (!res.ok || typeof body.access_token !== 'string') throw new Error(`sheets token ${res.status}`);
    token = { value: body.access_token, until: now() + (Number(body.expires_in) || 3600) * 1000 - 60_000 };
    return token.value;
  }

  async function call(path: string, init: RequestInit = {}): Promise<unknown> {
    const res = await fetchFn(`${SHEETS.api}/${cfg.sheetId}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
    });
    if (!res.ok) throw new Error(`sheets ${res.status}`);
    return res.json();
  }

  const values = (range: string) => `/values/${encodeURIComponent(range)}`;

  const sheets: Sheets = {
    async getValues(range) {
      const body = (await call(values(range))) as { values?: unknown };
      return Array.isArray(body.values) ? (body.values as unknown[][]).map((row) => row.map((cell) => String(cell ?? ''))) : [];
    },
    async append(tab, rows) {
      await call(`${values(`${tab}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ values: rows }) });
    },
    async batchUpdate(data) {
      await call('/values:batchUpdate', { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data }) });
    },
    /** Adds the tab if missing and writes the header row if it is empty. Checked once per instance. */
    async ensureTab(tab, headers) {
      if (ready.has(tab)) return;
      const meta = (await call('?fields=sheets.properties.title')) as { sheets?: { properties?: { title?: string } }[] };
      if (!meta.sheets?.some((s) => s.properties?.title === tab)) {
        await call(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }) });
      }
      // Write the header row if it is empty, or add columns a newer version appended (older cells untouched).
      const first = (await sheets.getValues(`${tab}!1:1`))[0] ?? [];
      if (first.length < headers.length && headers.slice(0, first.length).every((h, i) => h === first[i])) {
        const from = String.fromCharCode(65 + first.length);
        await sheets.batchUpdate([{ range: `${tab}!${from}1`, values: [headers.slice(first.length)] }]);
      }
      ready.add(tab);
    },
  };
  return sheets;
}

/** Users tab: one row per person, keyed by email. */
export const USERS_TAB = 'Users';
export const USER_HEADERS = ['email', 'name', 'google_id', 'registered_at', 'last_login_at', 'picture_url'];

/** First sign-in appends a row (registration); later sign-ins update the name, last login and profile picture. */
export async function upsertUser(
  sheets: Sheets,
  user: { email: string; name: string; sub: string; picture: string },
  nowIso: string,
): Promise<'registered' | 'returning'> {
  await sheets.ensureTab(USERS_TAB, USER_HEADERS);
  const emails = (await sheets.getValues(`${USERS_TAB}!A2:A`)).map((row) => (row[0] ?? '').trim().toLowerCase());
  const index = emails.indexOf(user.email.toLowerCase());
  if (index === -1) {
    await sheets.append(USERS_TAB, [[user.email, user.name, user.sub, nowIso, nowIso, user.picture]]);
    return 'registered';
  }
  const row = index + 2;
  await sheets.batchUpdate([
    { range: `${USERS_TAB}!B${row}:C${row}`, values: [[user.name, user.sub]] },
    { range: `${USERS_TAB}!E${row}:F${row}`, values: [[nowIso, user.picture]] },
  ]);
  return 'returning';
}

/** Tasks tab. Same columns as `TASK_HEADERS` in src/lib/timing.ts (passed in, so this file keeps no relative imports). */
export const TASKS_TAB = 'Tasks';

/**
 * Upsert task rows by `task_id` (column A) for one person. A row owned by someone else (column B) is never
 * touched (OWASP A01). `deletes` mark that person's existing rows `deleted` (rows are never removed).
 */
export async function upsertTasks(
  sheets: Sheets,
  headers: readonly string[],
  email: string,
  rows: string[][],
  deletes: { id: string; at: string }[],
): Promise<{ updated: number; appended: number; deleted: number; refused: number }> {
  await sheets.ensureTab(TASKS_TAB, [...headers]);
  const existing = await sheets.getValues(`${TASKS_TAB}!A2:B`);
  const where = new Map(existing.map((r, i) => [r[0] ?? '', { row: i + 2, owner: (r[1] ?? '').toLowerCase() }]));
  const mine = (id: string) => where.get(id)?.owner === email.toLowerCase();
  const lastCol = String.fromCharCode(64 + headers.length);
  const statusCol = String.fromCharCode(65 + headers.indexOf('status'));
  const updatedCol = String.fromCharCode(65 + headers.indexOf('updated_at'));

  const updates: { range: string; values: string[][] }[] = [];
  const appends: string[][] = [];
  let refused = 0;
  for (const row of rows) {
    const id = row[0] ?? '';
    const at = where.get(id);
    if (!at) appends.push(row);
    else if (mine(id)) updates.push({ range: `${TASKS_TAB}!A${at.row}:${lastCol}${at.row}`, values: [row] });
    else refused += 1;
  }
  let deleted = 0;
  for (const d of deletes) {
    const at = where.get(d.id);
    if (!at || !mine(d.id)) continue;
    updates.push({ range: `${TASKS_TAB}!${statusCol}${at.row}`, values: [['deleted']] }, { range: `${TASKS_TAB}!${updatedCol}${at.row}`, values: [[d.at]] });
    deleted += 1;
  }
  if (updates.length) await sheets.batchUpdate(updates);
  if (appends.length) await sheets.append(TASKS_TAB, appends);
  return { updated: updates.length - deleted * 2, appended: appends.length, deleted, refused };
}
