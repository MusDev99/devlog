import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleSettings, type SettingsDeps } from '../api/_lib/settings-handler.ts';
import { isJiraBase, jiraFromCells, jiraToCells } from '../src/lib/jira.ts';
import { isTargets, targetsFromCells, targetsToCells, type Targets } from '../src/lib/targets.ts';

test('targets ↔ sheet cells: round trip; blank or out-of-range cells read as "not set"', () => {
  const t: Targets = { tasks: 5, points: 21, minutes: 180 };
  assert.deepEqual(targetsToCells(t), ['5', '21', '180']);
  assert.deepEqual(targetsFromCells(targetsToCells(t)), t);
  assert.equal(targetsFromCells(['', '', '']), null);
  assert.equal(targetsFromCells(['5', '500', '180']), null, 'points above 100');
  assert.equal(targetsFromCells(['5', 'lots', '180']), null, 'not a number');
  assert.deepEqual(targetsFromCells(['5', '21', '17']), { tasks: 5, points: 21, minutes: 17 }, 'a hand-typed value in range is kept');
});

function deps(over: Partial<SettingsDeps<Targets>> = {}): SettingsDeps<Targets> & { written: string[][] } {
  const written: string[][] = [];
  return {
    configured: true,
    sheetConfigured: true,
    isSameOrigin: () => true,
    readUser: async () => ({ email: 'ana@example.com' }),
    allow: () => true,
    isValid: isTargets,
    fromCells: targetsFromCells,
    toCells: targetsToCells,
    read: async () => ['4', '13', '120'],
    write: async (_email, cells) => (written.push(cells), true),
    now: () => 0,
    written,
    ...over,
  };
}
const get = () => new Request('https://devlog.test/api/settings');
const put = (body: unknown) => new Request('https://devlog.test/api/settings', { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) });

test('GET returns my targets from the sheet, or null when never saved', async () => {
  assert.deepEqual(await (await handleSettings(get(), deps())).json(), { targets: { tasks: 4, points: 13, minutes: 120 } });
  assert.deepEqual(await (await handleSettings(get(), deps({ read: async () => ['', '', ''] }))).json(), { targets: null });
  assert.deepEqual(await (await handleSettings(get(), deps({ read: async () => null }))).json(), { targets: null });
});

test('PUT validates and writes my row', async () => {
  const d = deps();
  const res = await handleSettings(put({ targets: { tasks: 5, points: 21, minutes: 180 } }), d);
  assert.equal(res.status, 200);
  assert.deepEqual(d.written, [['5', '21', '180']]);
});

test('settings guards', async () => {
  const status = async (over: Partial<SettingsDeps<Targets>>, req: Request) => (await handleSettings(req, deps(over))).status;
  const good = { targets: { tasks: 5, points: 21, minutes: 180 } };
  assert.equal(await status({}, new Request('https://devlog.test/api/settings', { method: 'POST' })), 405);
  assert.equal(await status({ configured: false }, get()), 503);
  assert.equal(await status({ isSameOrigin: () => false }, put(good)), 403);
  assert.equal(await status({ isSameOrigin: () => false }, get()), 200, 'reads are not CSRF-sensitive');
  assert.equal(await status({ readUser: async () => null }, get()), 401);
  assert.equal(await status({ allow: () => false }, get()), 429);
  assert.equal(await status({ sheetConfigured: false }, get()), 503);
  assert.equal(await status({}, put('x'.repeat(2_000))), 413);
  assert.equal(await status({}, put('{nope')), 400);
  assert.equal(await status({}, put({ targets: { tasks: 0, points: 21, minutes: 180 } })), 400);
  assert.equal(await status({ write: async () => false }, put(good)), 404);
  assert.equal(await status({ read: async () => Promise.reject(new Error('sheets 500')) }, get()), 502);
});

function jiraDeps(over: Partial<SettingsDeps<string>> = {}): SettingsDeps<string> & { written: string[][] } {
  const written: string[][] = [];
  return {
    configured: true,
    sheetConfigured: true,
    isSameOrigin: () => true,
    readUser: async () => ({ email: 'ana@example.com' }),
    allow: () => true,
    field: 'jira',
    isValid: isJiraBase,
    fromCells: jiraFromCells,
    toCells: jiraToCells,
    read: async () => ['https://airasia.atlassian.net'],
    write: async (_email, cells) => (written.push(cells), true),
    now: () => 0,
    written,
    ...over,
  };
}
const putJira = (body: unknown) => new Request('https://devlog.test/api/jira', { method: 'PUT', body: JSON.stringify(body) });

test('jira: GET returns my Jira site under its own key; blank or hand-edited unsafe cells read as none', async () => {
  const req = new Request('https://devlog.test/api/jira');
  assert.deepEqual(await (await handleSettings(req, jiraDeps())).json(), { jira: 'https://airasia.atlassian.net' });
  assert.deepEqual(await (await handleSettings(req, jiraDeps({ read: async () => [''] }))).json(), { jira: '' });
  assert.deepEqual(await (await handleSettings(req, jiraDeps({ read: async () => ['javascript:alert(1)'] }))).json(), { jira: '' });
  assert.deepEqual(await (await handleSettings(req, jiraDeps({ read: async () => null }))).json(), { jira: null });
});

test('jira: PUT writes only a canonical https origin (or blank to clear); anything else is refused', async () => {
  const d = jiraDeps();
  assert.equal((await handleSettings(putJira({ jira: 'https://airasia.atlassian.net' }), d)).status, 200);
  assert.equal((await handleSettings(putJira({ jira: '' }), d)).status, 200);
  assert.deepEqual(d.written, [['https://airasia.atlassian.net'], ['']]);
  for (const bad of ['airasia.atlassian.net', 'http://airasia.atlassian.net', 'javascript:alert(1)', 'https://airasia.atlassian.net/browse', 42, null]) {
    assert.equal((await handleSettings(putJira({ jira: bad }), d)).status, 400, String(bad));
  }
  assert.equal((await handleSettings(putJira({ targets: { tasks: 1, points: 1, minutes: 15 } }), d)).status, 400, 'the targets key is not accepted here');
  assert.equal((await handleSettings(putJira({ jira: 'https://airasia.atlassian.net' }), jiraDeps({ isSameOrigin: () => false }))).status, 403);
  assert.equal(d.written.length, 2, 'refused requests wrote nothing');
});
