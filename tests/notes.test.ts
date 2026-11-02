import assert from 'node:assert/strict';
import { test } from 'node:test';
import { creditPomodoro, formatDuration, isNote, MAX_NOTE_LENGTH, moveNote, nextSize, parseDraft, placeOf, validateDraft, type Note } from '../src/lib/notes.ts';

test('parseDraft trims, collapses spaces and keeps the picked tag', () => {
  assert.deepEqual(parseDraft('  fixed   the  pipeline ', 'doing'), { text: 'fixed the pipeline', tag: 'doing' });
});

test('parseDraft lifts a tag prefix (Postel)', () => {
  assert.deepEqual(parseDraft('b: waiting on infra', 'done'), { text: 'waiting on infra', tag: 'blocker' });
  assert.deepEqual(parseDraft('Done: shipped PR #12', 'doing'), { text: 'shipped PR #12', tag: 'done' });
  assert.deepEqual(parseDraft('WIP : roster view', 'done'), { text: 'roster view', tag: 'doing' });
  assert.deepEqual(parseDraft('todo: write runbook', 'done'), { text: 'write runbook', tag: 'todo' });
  assert.deepEqual(parseDraft('bump deps', 'done'), { text: 'bump deps', tag: 'done' }, 'no false prefix match');
});

test('validateDraft rejects empty and over-long notes', () => {
  assert.equal(validateDraft({ text: '', tag: 'done' }), 'Write something first.');
  assert.match(validateDraft({ text: 'x'.repeat(MAX_NOTE_LENGTH + 1), tag: 'done' }) ?? '', /under 500/);
  assert.equal(validateDraft({ text: 'ok', tag: 'done' }), null);
});

test('moveNote changes status and stamps the move day, keeps the task', () => {
  const card: Note = { id: '1', text: 'Seat map', tag: 'doing', createdAt: '2026-10-27T01:00:00Z', day: '2026-10-27' };
  const moved = moveNote(card, 'done', new Date('2026-10-28T09:30:00Z'), '2026-10-28');
  assert.deepEqual(moved, { ...card, tag: 'done', day: '2026-10-28', movedAt: '2026-10-28T09:30:00.000Z' });
  assert.equal(card.tag, 'doing', 'original untouched');
});

const task = (id: string, extra: Partial<Note> = {}): Note => ({ id, text: id, tag: 'todo', createdAt: '2026-10-27T01:00:00Z', day: '2026-10-27', ...extra });

test('nextSize cycles S → M → L → S', () => {
  assert.deepEqual([nextSize(1), nextSize(3), nextSize(5)], [3, 5, 1]);
});

test('creditPomodoro adds a 🍅 and the focus minutes', () => {
  const once = creditPomodoro(task('a'), 25 * 60_000);
  assert.deepEqual([once.pomodoros, once.spentMs], [1, 1_500_000]);
  const twice = creditPomodoro(once, 25 * 60_000);
  assert.deepEqual([twice.pomodoros, twice.spentMs], [2, 3_000_000]);
});

test('placeOf: old tasks without a place read as Schedule; new ones can be unsorted', () => {
  assert.equal(placeOf(task('old')), 'schedule');
  assert.equal(placeOf(task('new', { quadrant: 'unsorted' })), 'unsorted');
});

test('formatDuration', () => {
  assert.equal(formatDuration(0, false), '0m');
  assert.equal(formatDuration(65_000, true), '1:05');
  assert.equal(formatDuration(3_909_000, true), '1:05:09');
  assert.equal(formatDuration(3_909_000, false), '1h 05m');
});

test('isNote skips corrupt rows', () => {
  assert.equal(isNote({ id: '1', text: 't', tag: 'done', createdAt: 'x', day: 'y' }), true);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', movedAt: 'z' }), true);
  assert.equal(isNote({ id: '1', text: 't', tag: 'done', createdAt: 'x', day: 'y', movedAt: 5 }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', quadrant: 'do', size: 3, spentMs: 0 }), true);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', quadrant: 'later' }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', quadrant: 'unsorted', pomodoros: 2 }), true);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', pomodoros: 1.5 }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'doing', createdAt: 'x', day: 'y', startedAt: 'z' }), true, 'legacy stopwatch rows still read');
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', size: 2 }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', spentMs: -1 }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'nope', createdAt: 'x', day: 'y' }), false);
  assert.equal(isNote(null), false);
});
