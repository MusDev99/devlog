import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNote, MAX_NOTE_LENGTH, moveNote, NEXT_TAG, parseDraft, validateDraft, type Note } from '../src/lib/notes.ts';

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

test('NEXT_TAG moves cards forward; blocked goes back to doing; done stays', () => {
  assert.deepEqual(NEXT_TAG, { todo: 'doing', doing: 'done', blocker: 'doing', done: null });
});

test('isNote skips corrupt rows', () => {
  assert.equal(isNote({ id: '1', text: 't', tag: 'done', createdAt: 'x', day: 'y' }), true);
  assert.equal(isNote({ id: '1', text: 't', tag: 'todo', createdAt: 'x', day: 'y', movedAt: 'z' }), true);
  assert.equal(isNote({ id: '1', text: 't', tag: 'done', createdAt: 'x', day: 'y', movedAt: 5 }), false);
  assert.equal(isNote({ id: '1', text: 't', tag: 'nope', createdAt: 'x', day: 'y' }), false);
  assert.equal(isNote(null), false);
});
