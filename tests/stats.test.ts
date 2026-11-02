import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Note } from '../src/lib/notes.ts';
import {
  breakdown,
  dayStats,
  DEFAULT_TARGETS,
  insights,
  isActive,
  isTargets,
  longestStreak,
  onTarget,
  series,
  streak,
  weekday,
  weeklyReview,
} from '../src/lib/stats.ts';

const TZ = 'UTC';
const TODAY = '2026-11-02';
const NOW = Date.parse('2026-11-02T12:00:00Z');
const MIN = 60_000;

const task = (id: string, extra: Partial<Note> = {}): Note => ({ id, text: id, tag: 'todo', createdAt: '2026-10-20T08:00:00Z', day: '2026-10-20', ...extra });
/** A run of `minutes` starting at `iso`. */
const run = (iso: string, minutes: number) => ({ s: iso, e: new Date(Date.parse(iso) + minutes * MIN).toISOString() });

test('dayStats: time by the day each run started, the running one up to now; done tasks and points by their done day', () => {
  const days = dayStats(
    [
      task('a', { runs: [run('2026-11-01T09:00:00Z', 30), run('2026-11-02T09:00:00Z', 20)] }),
      task('b', { tag: 'doing', startedAt: '2026-11-02T11:00:00Z' }),
      task('c', { tag: 'done', size: 3, day: TODAY }),
      task('d', { tag: 'done', day: '2026-11-01' }),
    ],
    NOW,
    TZ,
  );
  assert.deepEqual(days.get(TODAY), { day: TODAY, focusMs: 80 * MIN, runs: 2, done: 1, points: 3 });
  assert.deepEqual(days.get('2026-11-01'), { day: '2026-11-01', focusMs: 30 * MIN, runs: 1, done: 1, points: 1 });
});

test('dayStats: a run is dated in the user zone', () => {
  const days = dayStats([task('a', { runs: [run('2026-11-01T23:30:00Z', 10)] })], NOW, 'Asia/Kuala_Lumpur');
  assert.equal(days.get('2026-11-02')?.focusMs, 10 * MIN, '23:30 UTC is 07:30 next day in UTC+8');
});

test('series fills 7 days oldest first; weekday labels', () => {
  const s = series(new Map(), TODAY, 7);
  assert.deepEqual(s.map((d) => d.day), ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.equal(weekday(TODAY), 'Mon');
});

test('streak counts back from today, or from yesterday while today is still open; longest streak across history', () => {
  const days = dayStats(
    ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-31', '2026-11-01'].map((day) => task(day, { tag: 'done', day, size: 5 })),
    NOW,
    TZ,
  );
  assert.equal(streak(days, TODAY, isActive), 2, 'Sat + Sun; Monday not lost yet');
  assert.equal(streak(days, '2026-11-01', isActive), 2);
  assert.equal(streak(days, '2026-10-30', isActive), 0);
  assert.equal(longestStreak(days, isActive), 3);
  assert.equal(streak(days, TODAY, onTarget({ ...DEFAULT_TARGETS, points: 5 })), 2);
  assert.equal(streak(days, TODAY, onTarget({ ...DEFAULT_TARGETS, points: 6 })), 0);
});

test('weeklyReview: last 7 days against the 7 before, best day', () => {
  const days = dayStats(
    [task('a', { runs: [run('2026-10-31T09:00:00Z', 50), run('2026-11-02T09:00:00Z', 10), run('2026-10-22T09:00:00Z', 30)] })],
    NOW,
    TZ,
  );
  const r = weeklyReview(days, TODAY);
  assert.deepEqual([r.totalMs, r.previousMs, r.runs], [60 * MIN, 30 * MIN, 2]);
  assert.equal(r.bestDay?.day, '2026-10-31');
});

test('breakdown: per task largest first, shares, minutes per point, and time per quadrant within the window', () => {
  const b = breakdown(
    [
      task('big', { quadrant: 'do', size: 1, runs: [run('2026-11-01T09:00:00Z', 60)] }),
      task('small', { quadrant: 'schedule', size: 5, runs: [run('2026-11-02T09:00:00Z', 20), run('2026-10-01T09:00:00Z', 999)] }),
    ],
    NOW,
    TZ,
    TODAY,
  );
  assert.equal(b.totalMs, 80 * MIN, 'the October run is outside the 7 days');
  assert.deepEqual(b.tasks.map((t) => t.note.id), ['big', 'small']);
  assert.equal(b.tasks[0]?.share, 0.75);
  assert.equal(b.tasks[1]?.msPerPoint, 4 * MIN);
  assert.deepEqual([b.places.do, b.places.schedule, b.places.delegate], [60 * MIN, 20 * MIN, 0]);
});

test('insights: firefighting, slow sizing, blockers', () => {
  const list = insights(
    [
      task('fire', { quadrant: 'do', tag: 'done', size: 1, day: TODAY, runs: [run('2026-11-02T08:00:00Z', 120)] }),
      task('a', { quadrant: 'do', tag: 'done', size: 3, day: TODAY, runs: [run('2026-11-01T08:00:00Z', 30)] }),
      task('b', { quadrant: 'schedule', tag: 'done', size: 3, day: TODAY, runs: [run('2026-11-01T10:00:00Z', 30)] }),
      task('stuck', { tag: 'blocker' }),
    ],
    NOW,
    TZ,
    TODAY,
    DEFAULT_TARGETS,
  );
  const text = list.map((i) => i.text).join('\n');
  assert.match(text, /went to Do now: mostly firefighting/);
  assert.match(text, /"fire" took 2h 00m for 1 SP/);
  assert.match(text, /1 task is blocked/);
  assert.ok(list.length <= 5);
});

test('insights: nothing to say about an empty history but blockers', () => {
  assert.deepEqual(insights([], NOW, TZ, TODAY, DEFAULT_TARGETS), []);
});

test('isTargets keeps targets inside the stepper limits', () => {
  assert.equal(isTargets(DEFAULT_TARGETS), true);
  assert.equal(isTargets({ ...DEFAULT_TARGETS, points: 0 }), false);
  assert.equal(isTargets({ ...DEFAULT_TARGETS, minutes: 2.5 }), false);
  assert.equal(isTargets(null), false);
});
