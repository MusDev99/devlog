import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Note } from '../src/lib/notes.ts';
import { formatRecap, isRecapDay, rangeLabel, weekRange, weekRecap } from '../src/lib/recap.ts';

const note = (text: string, tag: Note['tag'], day: string, hour = 1): Note => ({
  id: `${day}-${text}`,
  text,
  tag,
  day,
  createdAt: `${day}T${String(hour).padStart(2, '0')}:00:00Z`,
});

test('week range: Monday to the given day, Sunday stays in its own week', () => {
  assert.deepEqual(weekRange('2026-10-30'), { start: '2026-10-26', end: '2026-10-30' }); // Friday
  assert.deepEqual(weekRange('2026-10-26'), { start: '2026-10-26', end: '2026-10-26' }); // Monday
  assert.deepEqual(weekRange('2026-11-01'), { start: '2026-10-26', end: '2026-11-01' }); // Sunday
  assert.deepEqual(weekRange('2026-03-01'), { start: '2026-02-23', end: '2026-03-01' }); // across a month
});

test('recap days: Friday and the weekend only', () => {
  const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
  assert.deepEqual(days.map(isRecapDay), [false, false, false, false, true, true, true]);
});

test('recap: shipped, still in progress, blockers, active days', () => {
  const notes = [
    note('Seat map refactor', 'doing', '2026-10-26'),
    note('Fixed flaky booking test', 'done', '2026-10-26', 2),
    note('Waiting on IAM access', 'blocker', '2026-10-27'),
    note('seat map refactor', 'done', '2026-10-29'),
    note('Pub/Sub dead-letter topic', 'doing', '2026-10-29', 2),
    note('Pub/Sub dead-letter topic', 'doing', '2026-10-30'),
    note('Fixed flaky booking test', 'done', '2026-10-30', 2),
  ];
  assert.deepEqual(weekRecap(notes), {
    activeDays: 4,
    shipped: ['Fixed flaky booking test', 'seat map refactor'],
    inProgress: ['Pub/Sub dead-letter topic'],
    blockers: ['Waiting on IAM access'],
  });
});

test('recap: empty week and copy text', () => {
  const empty = weekRecap([]);
  assert.deepEqual(empty, { activeDays: 0, shipped: [], inProgress: [], blockers: [] });
  assert.equal(rangeLabel('2026-10-26', '2026-10-30'), '26 Oct – 30 Oct');
  assert.equal(rangeLabel('2026-10-26', '2026-10-26'), '26 Oct');
  assert.equal(
    formatRecap({ activeDays: 1, shipped: ['A'], inProgress: [], blockers: [] }, '26 Oct'),
    'Week recap (26 Oct, 1 day logged)\n\nShipped\n- A\n\nIn progress\n- None\n\nBlockers\n- None',
  );
});
