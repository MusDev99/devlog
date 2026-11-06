import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTicker } from '../src/lib/clock.ts';

function fakeTimers() {
  let created = 0;
  let cancelled = 0;
  let fire: () => void = () => undefined;
  return {
    schedule: (fn: () => void) => {
      created += 1;
      fire = fn;
      return created;
    },
    cancel: () => void (cancelled += 1),
    tick: () => fire(),
    counts: () => ({ created, cancelled }),
  };
}

test('many listeners share one interval, and each hears every tick', () => {
  const t = fakeTimers();
  const ticker = createTicker(1000, t.schedule, t.cancel);
  let a = 0;
  let b = 0;
  const offA = ticker.subscribe(() => a++);
  const offB = ticker.subscribe(() => b++);
  assert.deepEqual(t.counts(), { created: 1, cancelled: 0 });
  t.tick();
  t.tick();
  assert.deepEqual([a, b], [2, 2]);
  offA();
  t.tick();
  assert.deepEqual([a, b], [2, 3]);
  offB();
});

test('the interval stops with the last listener and restarts for the next', () => {
  const t = fakeTimers();
  const ticker = createTicker(1000, t.schedule, t.cancel);
  const off = ticker.subscribe(() => undefined);
  off();
  off(); // stopping twice is harmless
  assert.deepEqual(t.counts(), { created: 1, cancelled: 1 });
  assert.equal(ticker.size(), 0);
  ticker.subscribe(() => undefined);
  assert.deepEqual(t.counts(), { created: 2, cancelled: 1 });
});

test('nothing runs while nobody listens', () => {
  const t = fakeTimers();
  createTicker(1000, t.schedule, t.cancel);
  assert.deepEqual(t.counts(), { created: 0, cancelled: 0 });
});
