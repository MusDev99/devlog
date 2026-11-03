import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Note, Run } from '../src/lib/notes.ts';
import { taskTiming } from '../src/lib/timing.ts';

const MIN = 60_000;
const at = (hhmm: string) => `2026-11-03T${hhmm}:00.000Z`;
const run = (from: string, to: string): Run => ({ s: at(from), e: at(to) });
const ms = (r: Run) => Date.parse(r.e) - Date.parse(r.s);
/** A task whose banked time equals its runs, as `stopTimer` leaves it. */
const task = (runs: Run[], extra: Partial<Note> = {}): Note => ({
  id: 't',
  text: 't',
  tag: 'done',
  createdAt: at('10:00'),
  day: '2026-11-03',
  runs,
  spentMs: runs.reduce((sum, r) => sum + ms(r), 0),
  ...extra,
});

test("owner's example: 11:00 to 13:00 with three 10-minute pauses → actual 1h 30m, span 2h", () => {
  const t = taskTiming(task([run('11:00', '11:20'), run('11:30', '12:00'), run('12:10', '12:40'), run('12:50', '13:00')]), 0);
  assert.deepEqual(t, {
    start: at('11:00'),
    end: at('13:00'),
    pauses: 3,
    pausedMs: 30 * MIN,
    actualMs: 90 * MIN,
    spanMs: 120 * MIN,
  });
});

test('no pauses: actual equals span', () => {
  const t = taskTiming(task([run('09:00', '09:45')]), 0);
  assert.deepEqual([t?.pauses, t?.actualMs, t?.spanMs, t?.pausedMs], [0, 45 * MIN, 45 * MIN, 0]);
});

test('running: the current run counts up to now, and so does the span', () => {
  const t = taskTiming(task([run('09:00', '09:30')], { tag: 'doing', startedAt: at('10:00') }), Date.parse(at('10:15')));
  assert.deepEqual([t?.actualMs, t?.spanMs, t?.pauses, t?.end], [45 * MIN, 75 * MIN, 1, at('10:15')]);
});

test('paused, not finished: the span ends at the last pause', () => {
  const t = taskTiming(task([run('09:00', '09:30'), run('09:40', '10:00')], { tag: 'doing' }), Date.parse(at('15:00')));
  assert.deepEqual([t?.end, t?.spanMs, t?.actualMs], [at('10:00'), 60 * MIN, 50 * MIN]);
});

test('runs out of order are sorted; back-to-back runs are not a pause', () => {
  const t = taskTiming(task([run('10:00', '10:30'), run('09:30', '10:00')]), 0);
  assert.deepEqual([t?.start, t?.pauses, t?.spanMs], [at('09:30'), 0, 60 * MIN]);
});

test('time logged before runs were dated: actual known, start and end unknown', () => {
  assert.deepEqual(taskTiming(task([], { spentMs: 25 * MIN }), 0), { start: null, end: null, pauses: 0, pausedMs: 0, actualMs: 25 * MIN, spanMs: 25 * MIN });
});

test('a task that never ran has no timing', () => {
  assert.equal(taskTiming(task([], { spentMs: 0 }), 0), null);
});
