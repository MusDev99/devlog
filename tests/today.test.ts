import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayKey, dayLabel, greeting } from '../src/lib/today.ts';

const KL = 'Asia/Kuala_Lumpur';

test('greeting follows the local hour, not UTC', () => {
  assert.equal(greeting(new Date('2026-10-28T00:30:00Z'), KL), 'Good morning'); // 08:30 KL
  assert.equal(greeting(new Date('2026-10-28T06:00:00Z'), KL), 'Good afternoon'); // 14:00 KL
  assert.equal(greeting(new Date('2026-10-28T11:00:00Z'), KL), 'Good evening'); // 19:00 KL
});

test('dayKey uses the local calendar day', () => {
  assert.equal(dayKey(new Date('2026-10-27T17:00:00Z'), KL), '2026-10-28'); // 01:00 KL next day
  assert.equal(dayKey(new Date('2026-10-27T17:00:00Z'), 'UTC'), '2026-10-27');
});

test('dayLabel is readable', () => {
  assert.equal(dayLabel(new Date('2026-10-28T02:00:00Z'), KL), 'Wednesday 28 Oct');
});
