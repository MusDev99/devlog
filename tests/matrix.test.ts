import assert from 'node:assert/strict';
import { test } from 'node:test';
import { doneBucket, listView, places, progressCount } from '../src/lib/matrix.ts';
import type { Note } from '../src/lib/notes.ts';

const TODAY = '2026-10-28';
const task = (id: string, extra: Partial<Note> = {}): Note => ({
  id,
  text: id,
  tag: 'todo',
  day: TODAY,
  createdAt: '2026-10-28T01:00:00Z',
  ...extra,
});

test('places: Unsorted then the four quadrants; tasks without a place read as Schedule', () => {
  const p = places([task('new', { quadrant: 'unsorted' }), task('old'), task('q4', { quadrant: 'eliminate' })]);
  assert.deepEqual(p.map((v) => v.place), ['unsorted', 'do', 'schedule', 'delegate', 'eliminate']);
  assert.deepEqual(p[0]?.tasks.map((n) => n.id), ['new']);
  assert.deepEqual(p[2]?.tasks.map((n) => n.id), ['old']);
});

test('places: a finished task leaves its quadrant; open work is Doing, Blocked, To do', () => {
  const q = { quadrant: 'do' } as const;
  const p = places([task('done', { ...q, tag: 'done' }), task('todo', q), task('blocked', { ...q, tag: 'blocker' }), task('doing', { ...q, tag: 'doing' })]);
  assert.deepEqual(p[1]?.tasks.map((n) => n.id), ['doing', 'blocked', 'todo']);
  assert.equal(p[1]?.open, 3);
});

test('places: points count open tasks only, unsized = 1', () => {
  const p = places([task('a', { quadrant: 'do', size: 5 }), task('b', { quadrant: 'do' }), task('c', { quadrant: 'do', size: 3, tag: 'done' })]);
  assert.equal(p[1]?.points, 6);
});

test('listView: open work by place; finished tasks are not listed', () => {
  const list = listView([task('done', { tag: 'done' }), task('q1', { quadrant: 'do' }), task('in', { quadrant: 'unsorted' })]);
  assert.deepEqual(list.map((n) => n.id), ['in', 'q1']);
});

test('doneBucket: newest finished first; older than a week folds into earlier; keeps each task’s quadrant for Restore', () => {
  const bucket = doneBucket(
    [
      task('first', { tag: 'done', quadrant: 'do', movedAt: '2026-10-27T09:00:00Z', day: '2026-10-27' }),
      task('latest', { tag: 'done', quadrant: 'delegate', movedAt: '2026-10-28T09:00:00Z' }),
      task('old', { tag: 'done', movedAt: '2026-10-01T09:00:00Z', day: '2026-10-01' }),
      task('open'),
    ],
    TODAY,
  );
  assert.deepEqual(bucket.recent.map((n) => n.id), ['latest', 'first']);
  assert.deepEqual(bucket.earlier.map((n) => n.id), ['old']);
  assert.equal(bucket.recent[0]?.quadrant, 'delegate');
});

test('progressCount: done this week out of open + done this week', () => {
  assert.deepEqual(progressCount([task('a', { tag: 'done' }), task('b'), task('c', { tag: 'done', day: '2026-10-01' })], TODAY), { done: 1, total: 2 });
});
