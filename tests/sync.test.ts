import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Note } from '../src/lib/notes.ts';
import { backoffMs, batches, count, pending, versionOf, type SyncState } from '../src/lib/sync.ts';

const task = (id: string, updatedAt?: string, extra: Partial<Note> = {}): Note => ({
  id,
  text: id,
  tag: 'todo',
  createdAt: '2026-11-01T08:00:00.000Z',
  day: '2026-11-01',
  ...(updatedAt ? { updatedAt } : {}),
  ...extra,
});

test('pending: never synced, or saved since the last sync; synced and unchanged tasks stay put', () => {
  const notes = [task('new', '2026-11-03T09:00:00Z'), task('changed', '2026-11-03T10:00:00Z'), task('same', '2026-11-03T08:00:00Z'), task('old')];
  const states: SyncState[] = [
    { id: 'changed', syncedAt: '2026-11-03T09:30:00Z' },
    { id: 'same', syncedAt: '2026-11-03T08:00:00Z' },
  ];
  assert.deepEqual(pending(notes, states).upserts.map((n) => n.id), ['new', 'changed', 'old']);
  assert.equal(versionOf(task('old')), '2026-11-01T08:00:00.000Z', 'tasks saved before stamping use their creation time');
});

test('pending: deletes only for tasks the sheet has and that are really gone (Undo cancels)', () => {
  const states: SyncState[] = [
    { id: 'gone', syncedAt: 'x', deletedAt: '2026-11-03T11:00:00Z' },
    { id: 'restored', syncedAt: 'x', deletedAt: '2026-11-03T11:00:00Z' },
  ];
  const work = pending([task('restored', '2026-11-03T11:01:00Z')], states);
  assert.deepEqual(work.deletes, [{ id: 'gone', at: '2026-11-03T11:00:00Z' }]);
});

test('batches: split by item count and by size, nothing lost or reordered', () => {
  const work = { upserts: Array.from({ length: 95 }, (_, i) => task(`t${i}`)), deletes: [{ id: 'd1', at: 'a' }] };
  const byCount = batches(work, 40);
  assert.deepEqual(byCount.map(count), [40, 40, 16]);
  assert.deepEqual(byCount.flatMap((b) => b.upserts.map((n) => n.id)), work.upserts.map((n) => n.id));
  const big = task('big', undefined, { text: 'x'.repeat(30_000) });
  assert.deepEqual(batches({ upserts: [big, big, big], deletes: [] }, 40, 48_000).map(count), [1, 1, 1], 'size cap');
  assert.deepEqual(batches({ upserts: [], deletes: [] }), []);
});

test('backoff: 15s, 30s, 1m … capped at 5 minutes', () => {
  assert.deepEqual([1, 2, 3, 10].map(backoffMs), [15_000, 30_000, 60_000, 300_000]);
});
