import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendar, csvCell, dayTasks, REPORT_HEADERS, reportCsv, tasksBetween } from '../src/lib/calendar.ts';
import type { Note } from '../src/lib/notes.ts';
import { dayStats } from '../src/lib/stats.ts';

const TZ = 'UTC';
const TODAY = '2026-11-04'; // a Wednesday
const NOW = Date.parse('2026-11-04T12:00:00Z');
const MIN = 60_000;
const task = (id: string, extra: Partial<Note> = {}): Note => ({ id, text: id, tag: 'todo', createdAt: '2026-10-20T08:00:00Z', day: '2026-10-20', ...extra });
const run = (iso: string, minutes: number) => ({ s: iso, e: new Date(Date.parse(iso) + minutes * MIN).toISOString() });

test('calendar: 12 Monday-first weeks ending in the week of today; later days are future', () => {
  const c = calendar(new Map(), TODAY);
  assert.equal(c.weeks.length, 12);
  assert.ok(c.weeks.every((w) => w.length === 7));
  assert.equal(c.weeks[11]?.[0]?.day, '2026-11-02');
  assert.equal(c.from, '2026-08-17');
  assert.deepEqual(c.weeks[11]?.map((d) => d.future), [false, false, false, true, true, true, true]);
});

test('calendar: levels in quarters of the busiest day; finished tasks without time count as level 1', () => {
  const notes = [
    task('a', { runs: [run('2026-11-02T09:00:00Z', 120)] }),
    task('b', { runs: [run('2026-11-03T09:00:00Z', 30)] }),
    task('c', { tag: 'done', day: '2026-11-04' }),
  ];
  const week = calendar(dayStats(notes, NOW, TZ), TODAY).weeks[11] ?? [];
  assert.deepEqual(week.slice(0, 3).map((d) => d.level), [4, 1, 1]);
});

test('calendar: month labels over the weeks holding a 1st', () => {
  const c = calendar(new Map(), TODAY);
  assert.deepEqual(c.months.map((m) => m.label), ['Aug', 'Sep', 'Oct', 'Nov']);
  assert.ok(c.months.every((m, i, all) => i === 0 || m.col > (all[i - 1]?.col ?? -1) + 1));
});

test('dayTasks: tasks timed that day (time that day only) and tasks finished that day, most time first', () => {
  const long = task('long', { runs: [run('2026-11-03T09:00:00Z', 60), run('2026-11-02T09:00:00Z', 500)] });
  const short = task('short', { tag: 'done', day: '2026-11-03', runs: [run('2026-11-03T14:00:00Z', 20)] });
  const noTime = task('noTime', { tag: 'done', day: '2026-11-03' });
  const other = task('other', { runs: [run('2026-11-01T09:00:00Z', 30)] });
  const list = dayTasks([noTime, short, long, other], '2026-11-03', NOW, TZ);
  assert.deepEqual(list.map((t) => [t.note.id, t.ms / MIN, t.finished]), [
    ['long', 60, false],
    ['short', 20, true],
    ['noTime', 0, true],
  ]);
});

test('tasksBetween: changed or timed in range', () => {
  const list = tasksBetween([task('changed', { day: '2026-11-01' }), task('timed', { runs: [run('2026-11-02T09:00:00Z', 5)] }), task('old')], '2026-11-01', TODAY, NOW, TZ);
  assert.deepEqual(list.map((n) => n.id), ['changed', 'timed']);
});

test('csvCell: quotes commas, quotes and line breaks; formulas become text', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a, b'), '"a, b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line\nbreak'), '"line\nbreak"');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
});

test("reportCsv: header then one row per task; owner's 11:00 → 13:00 example; links split out; local times", () => {
  const owner = task('t1', {
    text: 'Fix bugs on 10143 https://airasia.atlassian.net/browse/SKYIQ-10143',
    tag: 'done',
    quadrant: 'do',
    size: 3,
    day: '2026-11-03',
    movedAt: '2026-11-03T13:00:00Z',
    runs: [run('2026-11-03T11:00:00Z', 20), run('2026-11-03T11:30:00Z', 30), run('2026-11-03T12:10:00Z', 30), run('2026-11-03T12:50:00Z', 10)],
    spentMs: 90 * MIN,
  });
  const lines = reportCsv([owner, task('t2', { text: 'Plan, then build' })], NOW, 'Asia/Kuala_Lumpur').split('\r\n');
  assert.equal(lines[0], REPORT_HEADERS.join(','));
  assert.equal(
    lines[1],
    '2026-11-03,Fix bugs on 10143 SKYIQ-10143,https://airasia.atlassian.net/browse/SKYIQ-10143,Do now,3,Done,2026-10-20 16:00,2026-11-03 19:00,2026-11-03 21:00,3,30,90,120,1h 30m,2h 00m',
  );
  assert.equal(lines[2], '2026-10-20,"Plan, then build",,Schedule,1,To do,2026-10-20 16:00,,,,,,,,');
  assert.equal(lines[3], '');
});
