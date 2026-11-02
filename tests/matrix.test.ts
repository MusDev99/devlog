import assert from 'node:assert/strict';
import { test } from 'node:test';
import { doneList, matrix, shortDay, stats } from '../src/lib/matrix.ts';
import type { Note } from '../src/lib/notes.ts';

const NOW = Date.parse('2026-10-28T10:00:00Z');
const task = (id: string, extra: Partial<Note> = {}): Note => ({
  id,
  text: id,
  tag: 'todo',
  day: '2026-10-28',
  createdAt: '2026-10-28T01:00:00Z',
  ...extra,
});

test('matrix: four quadrants in grid order; old tasks without a quadrant read as Schedule', () => {
  const m = matrix([task('a', { quadrant: 'do' }), task('old'), task('d', { quadrant: 'eliminate' })], NOW);
  assert.deepEqual(m.map((q) => q.quadrant), ['do', 'schedule', 'delegate', 'eliminate']);
  assert.deepEqual(m[1]?.tasks.map((n) => n.id), ['old']);
});

test('matrix: running first, then Doing, Blocked, To do; done tasks left out', () => {
  const m = matrix(
    [
      task('todo', { quadrant: 'do' }),
      task('blocked', { quadrant: 'do', tag: 'blocker' }),
      task('doing', { quadrant: 'do', tag: 'doing' }),
      task('running', { quadrant: 'do', tag: 'doing', startedAt: '2026-10-28T09:00:00Z' }),
      task('finished', { quadrant: 'do', tag: 'done' }),
    ],
    NOW,
  );
  assert.deepEqual(m[0]?.tasks.map((n) => n.id), ['running', 'doing', 'blocked', 'todo']);
});

test('matrix and stats: points from sizes (unsized = 1), tracked time includes the running timer', () => {
  const notes = [
    task('a', { quadrant: 'do', size: 5, spentMs: 60_000 }),
    task('b', { quadrant: 'do', tag: 'doing', size: 3, startedAt: '2026-10-28T09:30:00Z' }),
    task('c', { quadrant: 'do' }),
    task('done', { quadrant: 'do', tag: 'done', size: 5, spentMs: 999 }),
  ];
  assert.equal(matrix(notes, NOW)[0]?.points, 9);
  assert.equal(matrix(notes, NOW)[0]?.trackedMs, 60_000 + 30 * 60_000);
  assert.deepEqual(stats(notes, NOW), { open: 3, points: 9, trackedMs: 31 * 60_000 });
});

test('doneList: newest first, older than 7 days folds into earlier', () => {
  const list = doneList(
    [task('new', { tag: 'done', day: '2026-10-21' }), task('old', { tag: 'done', day: '2026-10-20' }), task('open')],
    '2026-10-28',
  );
  assert.deepEqual(list.recent.map((n) => n.id), ['new']);
  assert.deepEqual(list.earlier.map((n) => n.id), ['old']);
});

test('shortDay labels', () => {
  assert.equal(shortDay('2026-10-28', '2026-10-28'), 'Today');
  assert.equal(shortDay('2026-10-27', '2026-10-28'), 'Yesterday');
  assert.equal(shortDay('2026-10-02', '2026-10-28'), '2 Oct');
});
