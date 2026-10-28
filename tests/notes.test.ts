import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupByTag, isNote, MAX_NOTE_LENGTH, parseDraft, validateDraft, type Note } from '../src/lib/notes.ts';

test('parseDraft trims, collapses spaces and keeps the picked tag', () => {
  assert.deepEqual(parseDraft('  fixed   the  pipeline ', 'doing'), { text: 'fixed the pipeline', tag: 'doing' });
});

test('parseDraft lifts a tag prefix (Postel)', () => {
  assert.deepEqual(parseDraft('b: waiting on infra', 'done'), { text: 'waiting on infra', tag: 'blocker' });
  assert.deepEqual(parseDraft('Done: shipped PR #12', 'doing'), { text: 'shipped PR #12', tag: 'done' });
  assert.deepEqual(parseDraft('WIP : roster view', 'done'), { text: 'roster view', tag: 'doing' });
  assert.deepEqual(parseDraft('bump deps', 'done'), { text: 'bump deps', tag: 'done' }, 'no false prefix match');
});

test('validateDraft rejects empty and over-long notes', () => {
  assert.equal(validateDraft({ text: '', tag: 'done' }), 'Write something first.');
  assert.match(validateDraft({ text: 'x'.repeat(MAX_NOTE_LENGTH + 1), tag: 'done' }) ?? '', /under 500/);
  assert.equal(validateDraft({ text: 'ok', tag: 'done' }), null);
});

test('groupByTag keeps write order inside each group', () => {
  const n = (id: string, tag: Note['tag'], createdAt: string): Note => ({ id, text: id, tag, createdAt, day: '2026-10-28' });
  const g = groupByTag([n('b', 'done', '2026-10-28T02:00:00Z'), n('a', 'done', '2026-10-28T01:00:00Z'), n('c', 'blocker', '2026-10-28T03:00:00Z')]);
  assert.deepEqual(g.done.map((x) => x.id), ['a', 'b']);
  assert.deepEqual(g.doing, []);
  assert.deepEqual(g.blocker.map((x) => x.id), ['c']);
});

test('isNote skips corrupt rows', () => {
  assert.equal(isNote({ id: '1', text: 't', tag: 'done', createdAt: 'x', day: 'y' }), true);
  assert.equal(isNote({ id: '1', text: 't', tag: 'nope', createdAt: 'x', day: 'y' }), false);
  assert.equal(isNote(null), false);
});
