import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  elapsedMs,
  formatDuration,
  isNote,
  MAX_NOTE_LENGTH,
  moveNote,
  nextSize,
  parseDraft,
  startTimer,
  stopTimer,
  validateDraft,
  type Note,
} from '../src/lib/notes.ts';

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

test('moveNote changes column and stamps the move day, keeps the card', () => {
  const card: Note = { id: '1', text: 'Seat map', tag: 'doing', createdAt: '2026-10-27T01:00:00Z', day: '2026-10-27' };
  const moved = moveNote(card, 'done', new Date('2026-10-28T09:30:00Z'), '2026-10-28');
  assert.deepEqual(moved, { ...card, tag: 'done', day: '2026-10-28', movedAt: '2026-10-28T09:30:00.000Z' });
  assert.equal(card.tag, 'doing', 'original untouched');
});

const AT = new Date('2026-10-28T10:00:00Z');
const task = (id: string, extra: Partial<Note> = {}): Note => ({ id, text: id, tag: 'todo', createdAt: '2026-10-27T01:00:00Z', day: '2026-10-27', ...extra });

test('nextSize cycles S → M → L → S', () => {
  assert.deepEqual([nextSize(1), nextSize(3), nextSize(5)], [3, 5, 1]);
});

test('startTimer: stops the other running task, marks the target Doing, returns only changed tasks', () => {
  const notes = [task('a', { tag: 'doing', startedAt: '2026-10-28T09:00:00Z', spentMs: 1000 }), task('b'), task('c')];
  const changed = startTimer(notes, 'b', AT, '2026-10-28');
  assert.deepEqual(changed.map((n) => n.id), ['a', 'b']);
  assert.equal(changed[0]?.startedAt, undefined);
  assert.equal(changed[0]?.spentMs, 1000 + 3_600_000);
  assert.equal(changed[1]?.tag, 'doing');
  assert.equal(changed[1]?.startedAt, '2026-10-28T10:00:00.000Z');
  assert.equal(changed[1]?.day, '2026-10-28');
});

test('startTimer: nothing to do for a done task, a running task or an unknown id', () => {
  assert.deepEqual(startTimer([task('d', { tag: 'done' })], 'd', AT, '2026-10-28'), []);
  assert.deepEqual(startTimer([task('r', { tag: 'doing', startedAt: '2026-10-28T09:00:00Z' })], 'r', AT, '2026-10-28'), []);
  assert.deepEqual(startTimer([], 'x', AT, '2026-10-28'), []);
});

test('stopTimer banks the run; elapsedMs adds the running part', () => {
  const running = task('a', { tag: 'doing', startedAt: '2026-10-28T09:59:00Z', spentMs: 5000 });
  assert.equal(elapsedMs(running, AT.getTime()), 65_000);
  const stopped = stopTimer(running, AT);
  assert.equal(stopped.spentMs, 65_000);
  assert.equal('startedAt' in stopped, false);
  assert.equal(stopTimer(task('b'), AT).spentMs, undefined, 'stopped task unchanged');
});

test('moveNote away from Doing stops the timer; staying Doing keeps it', () => {
  const running = task('a', { tag: 'doing', startedAt: '2026-10-28T09:00:00Z' });
  assert.equal(moveNote(running, 'done', AT, '2026-10-28').startedAt, undefined);
  assert.equal(moveNote(running, 'done', AT, '2026-10-28').spentMs, 3_600_000);
  assert.equal(moveNote(running, 'doing', AT, '2026-10-28').startedAt, '2026-10-28T09:00:00Z');
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
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', size: 2 }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', spentMs: -1 }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'nope', createdAt: 'x', day: 'y' }), false);
  assert.equal(isNote(null), false);
});
