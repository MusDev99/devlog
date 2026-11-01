import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardColumns, shortDay } from '../src/lib/board.ts';
import type { Note } from '../src/lib/notes.ts';

const card = (id: string, tag: Note['tag'], day: string, movedAt?: string): Note => ({
  id,
  text: id,
  tag,
  day,
  createdAt: `${day}T01:00:00Z`,
  ...(movedAt ? { movedAt } : {}),
});

test('columns come in board order, newest change first', () => {
  const cols = boardColumns(
    [card('a', 'doing', '2026-10-27'), card('b', 'doing', '2026-10-28'), card('c', 'todo', '2026-10-20', '2026-10-28T05:00:00Z')],
    '2026-10-28',
  );
  assert.deepEqual(cols.map((c) => c.tag), ['todo', 'doing', 'blocker', 'done']);
  assert.deepEqual(cols[1]?.cards.map((n) => n.id), ['b', 'a']);
  assert.deepEqual(cols[0]?.cards.map((n) => n.id), ['c']);
});

test('done cards older than 7 days fold into earlier', () => {
  const done = boardColumns([card('new', 'done', '2026-10-21'), card('old', 'done', '2026-10-20')], '2026-10-28')[3];
  assert.deepEqual(done?.cards.map((n) => n.id), ['new']);
  assert.deepEqual(done?.earlier.map((n) => n.id), ['old']);
});

test('shortDay labels', () => {
  assert.equal(shortDay('2026-10-28', '2026-10-28'), 'Today');
  assert.equal(shortDay('2026-10-27', '2026-10-28'), 'Yesterday');
  assert.equal(shortDay('2026-10-02', '2026-10-28'), '2 Oct');
});
