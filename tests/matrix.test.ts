import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listView, places, progressCount } from '../src/lib/matrix.ts';
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
  const p = places([task('new', { quadrant: 'unsorted' }), task('old'), task('q4', { quadrant: 'eliminate' })], TODAY);
  assert.deepEqual(p.map((v) => v.place), ['unsorted', 'do', 'schedule', 'delegate', 'eliminate']);
  assert.deepEqual(p[0]?.tasks.map((n) => n.id), ['new']);
  assert.deepEqual(p[2]?.tasks.map((n) => n.id), ['old']);
});

test('places: open work first (Doing, Blocked, To do), this week done after, older done hidden', () => {
  const q = { quadrant: 'do' } as const;
  const p = places(
    [
      task('done-old', { ...q, tag: 'done', day: '2026-10-20' }),
      task('done', { ...q, tag: 'done' }),
      task('todo', q),
      task('blocked', { ...q, tag: 'blocker' }),
      task('doing', { ...q, tag: 'doing' }),
    ],
    TODAY,
  );
  assert.deepEqual(p[1]?.tasks.map((n) => n.id), ['doing', 'blocked', 'todo', 'done']);
  assert.equal(p[1]?.open, 3);
});

test('places: points count open tasks only, unsized = 1', () => {
  const p = places([task('a', { quadrant: 'do', size: 5 }), task('b', { quadrant: 'do' }), task('c', { quadrant: 'do', size: 3, tag: 'done' })], TODAY);
  assert.equal(p[1]?.points, 6);
});

test('listView: open by place, then done; old done in earlier', () => {
  const list = listView(
    [task('done', { tag: 'done' }), task('q1', { quadrant: 'do' }), task('in', { quadrant: 'unsorted' }), task('old', { tag: 'done', day: '2026-10-01' })],
    TODAY,
  );
  assert.deepEqual(list.tasks.map((n) => n.id), ['in', 'q1', 'done']);
  assert.deepEqual(list.earlier.map((n) => n.id), ['old']);
});

test('progressCount: done out of what is on screen', () => {
  assert.deepEqual(progressCount([task('a', { tag: 'done' }), task('b'), task('c', { tag: 'done', day: '2026-10-01' })], TODAY), { done: 1, total: 2 });
});
