import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSheets, readSheetsConfig, serviceJwt, SHEETS, upsertUser, USERS_TAB, type SheetsConfig } from '../api/_lib/sheets.ts';

const NOW = Date.UTC(2026, 10, 3, 9, 0, 0);
const dec = new TextDecoder();
const fromB64u = (t: string) => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));

/** A real RSA key pair, as a service account's JSON key would hold it. */
async function testKey() {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  let bin = '';
  for (const b of der) bin += String.fromCharCode(b);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin).replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`;
  return { pem, publicKey: pair.publicKey };
}

const cfgWith = (privateKey: string): SheetsConfig => ({ configured: true, clientEmail: 'devlog@proj.iam.gserviceaccount.com', privateKey, sheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz' });

test('config: needs the account email, a private key and a sheet id; one-line keys are unescaped', () => {
  const env = { GOOGLE_SERVICE_ACCOUNT_EMAIL: 'a@b.iam.gserviceaccount.com', GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----', SHEET_ID: '1AbCdEfGhIjKlMnOpQrStUvWxYz' };
  const cfg = readSheetsConfig(env);
  assert.equal(cfg.configured, true);
  assert.equal(cfg.privateKey, '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----');
  for (const key of Object.keys(env)) assert.equal(readSheetsConfig({ ...env, [key]: '' }).configured, false, key);
  assert.equal(readSheetsConfig({ ...env, SHEET_ID: 'https://evil.example/x' }).configured, false, 'an id, not a URL');
});

test('service JWT: RS256 signed by the key, issued by the account, for the Sheets scope at the fixed token host', async () => {
  const { pem, publicKey } = await testKey();
  const jwt = await serviceJwt(cfgWith(pem), NOW);
  const [h, p, s] = jwt.split('.') as [string, string, string];
  assert.deepEqual(JSON.parse(dec.decode(fromB64u(h))), { alg: 'RS256', typ: 'JWT' });
  const claims = JSON.parse(dec.decode(fromB64u(p))) as Record<string, unknown>;
  assert.deepEqual(claims, { iss: 'devlog@proj.iam.gserviceaccount.com', scope: SHEETS.scope, aud: SHEETS.token, iat: NOW / 1000, exp: NOW / 1000 + 3600 });
  assert.equal(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, fromB64u(s), new TextEncoder().encode(`${h}.${p}`)), true);
});

/** A fake Google: a token endpoint and a spreadsheet with tabs of rows. Records every call. */
function fakeGoogle(tabs: Record<string, string[][]>) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  const fetchFn = async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : null;
    calls.push({ method, url: decodeURIComponent(url), body });
    const ok = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
    if (url === SHEETS.token) return ok({ access_token: 'tok', expires_in: 3600 });
    const path = decodeURIComponent(url.split('/spreadsheets/1AbCdEfGhIjKlMnOpQrStUvWxYz')[1] ?? '');
    if (path.startsWith('?fields')) return ok({ sheets: Object.keys(tabs).map((title) => ({ properties: { title } })) });
    if (path === ':batchUpdate') {
      const title = (body as { requests: { addSheet: { properties: { title: string } } }[] }).requests[0]?.addSheet.properties.title ?? '';
      tabs[title] = [];
      return ok({});
    }
    if (path === '/values:batchUpdate') {
      for (const d of (body as { data: { range: string; values: string[][] }[] }).data) {
        const [tab, cell] = d.range.split('!') as [string, string];
        const row = Number(cell.match(/\d+/)?.[0] ?? 1) - 1;
        const rows = (tabs[tab] ??= []);
        const col = (cell.charCodeAt(0) - 65) | 0;
        rows[row] ??= [];
        d.values[0]?.forEach((v, i) => ((rows[row] as string[])[col + i] = v));
      }
      return ok({});
    }
    const append = path.match(/^\/values\/(\w+)!A1:append/);
    if (append) {
      tabs[append[1] ?? ''] = [...(tabs[append[1] ?? ''] ?? []), ...(body as { values: string[][] }).values];
      return ok({});
    }
    const header = path.match(/^\/values\/(\w+)!1:1/);
    if (header) return ok({ values: (tabs[header[1] ?? ''] ?? []).slice(0, 1).filter((r) => r.length > 0) });
    const get = path.match(/^\/values\/(\w+)!A(\d+):A(\d*)/);
    if (get) {
      const from = Number(get[2]) - 1;
      const to = get[3] ? Number(get[3]) : undefined;
      return ok({ values: (tabs[get[1] ?? ''] ?? []).slice(from, to).map((r) => [r[0] ?? '']).filter((r) => r[0] !== '') });
    }
    return new Response('{}', { status: 404 });
  };
  return { fetchFn, calls, tabs };
}

test('upsertUser: creates the tab and headers, registers a new email, updates a returning one; token fetched once', async () => {
  const { pem } = await testKey();
  const google = fakeGoogle({});
  let clock = NOW;
  const sheets = createSheets(cfgWith(pem), google.fetchFn, () => clock);

  const pic = 'https://lh3.googleusercontent.com/a/ana=s96-c';
  assert.equal(await upsertUser(sheets, { email: 'Ana@Example.com', name: 'Ana', sub: 'g1', picture: pic }, '2026-11-03T09:00:00.000Z'), 'registered');
  assert.deepEqual(google.tabs[USERS_TAB], [
    ['email', 'name', 'google_id', 'registered_at', 'last_login_at', 'picture_url'],
    ['Ana@Example.com', 'Ana', 'g1', '2026-11-03T09:00:00.000Z', '2026-11-03T09:00:00.000Z', pic],
  ]);

  clock += 60_000;
  const newPic = 'https://lh3.googleusercontent.com/a/ana2=s96-c';
  assert.equal(await upsertUser(sheets, { email: 'ana@example.com', name: 'Ana B', sub: 'g1', picture: newPic }, '2026-11-04T08:00:00.000Z'), 'returning');
  assert.deepEqual(google.tabs[USERS_TAB]?.[1], ['Ana@Example.com', 'Ana B', 'g1', '2026-11-03T09:00:00.000Z', '2026-11-04T08:00:00.000Z', newPic]);
  assert.equal(google.tabs[USERS_TAB]?.length, 2, 'no duplicate row');

  assert.equal(google.calls.filter((c) => c.url === SHEETS.token).length, 1, 'access token cached');
  for (const c of google.calls.filter((c) => c.url.includes('values') && c.method !== 'GET')) {
    assert.ok(c.url.includes('valueInputOption=RAW') || (c.body as { valueInputOption?: string }).valueInputOption === 'RAW', `RAW: ${c.url}`);
  }
});

test('an existing Users tab from before picture_url gains the header; its rows stay as they were', async () => {
  const { pem } = await testKey();
  const old = [['email', 'name', 'google_id', 'registered_at', 'last_login_at'], ['bo@example.com', 'Bo', 'g2', 'r', 'l']];
  const google = fakeGoogle({ [USERS_TAB]: old.map((r) => [...r]) });
  await upsertUser(createSheets(cfgWith(pem), google.fetchFn, () => NOW), { email: 'bo@example.com', name: 'Bo', sub: 'g2', picture: '' }, 'now');
  assert.deepEqual(google.tabs[USERS_TAB]?.[0], ['email', 'name', 'google_id', 'registered_at', 'last_login_at', 'picture_url']);
  assert.deepEqual(google.tabs[USERS_TAB]?.[1], ['bo@example.com', 'Bo', 'g2', 'r', 'now', '']);
});

test('a Sheets error surfaces as an exception (the caller decides what to do)', async () => {
  const { pem } = await testKey();
  const sheets = createSheets(cfgWith(pem), async (url) => (url === SHEETS.token ? new Response('{"access_token":"t"}') : new Response('', { status: 403 })), () => NOW);
  await assert.rejects(sheets.getValues('Users!A2:A'), /sheets 403/);
});
