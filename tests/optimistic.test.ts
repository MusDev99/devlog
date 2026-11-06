import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Note } from '../src/lib/notes.ts';
import { applyChange, revertChange, snapshot } from '../src/lib/optimistic.ts';

const note = (id: string, text = id): Note => ({ id, text, tag: 'todo', createdAt: '2026-11-06T00:00:00.000Z', day: '2026-11-06' });
const ids = (list: Note[]) => list.map((n) => n.id).sort();

test('applyChange replaces by id and appends new tasks', () => {
  const list = applyChange([note('a'), note('b')], [note('b', 'B2'), note('c')]);
  assert.deepEqual(ids(list), ['a', 'b', 'c']);
  assert.equal(list.find((n) => n.id === 'b')?.text, 'B2');
});

test('a failed edit puts the task back as it was', () => {
  const a = note('a');
  const edited = note('a', 'edited');
  const before = snapshot([a], [edited]);
  const shown = applyChange([a], [edited]);
  assert.deepEqual(revertChange(shown, [edited], before), [a]);
});

test('a failed add removes the new task', () => {
  const fresh = note('new');
  const before = snapshot([note('a')], [fresh]);
  const shown = applyChange([note('a')], [fresh]);
  assert.deepEqual(ids(revertChange(shown, [fresh], before)), ['a']);
});

test('a later edit of the same task survives an earlier failure', () => {
  const a = note('a');
  const first = note('a', 'first');
  const second = note('a', 'second');
  const before = snapshot([a], [first]);
  const shown = applyChange(applyChange([a], [first]), [second]);
  assert.equal(revertChange(shown, [first], before).find((n) => n.id === 'a')?.text, 'second');
});

test('a failure never touches other tasks, including ones changed together', () => {
  const [a, b, c] = [note('a'), note('b'), note('c')];
  const changed = [note('a', 'A2'), note('b', 'B2')];
  const before = snapshot([a, b, c], changed);
  const shown = applyChange([a, b, c], changed);
  const back = revertChange(shown, changed, before);
  assert.deepEqual(ids(back), ['a', 'b', 'c']);
  assert.equal(back.find((n) => n.id === 'a')?.text, 'a');
  assert.equal(back.find((n) => n.id === 'c'), c);
});
