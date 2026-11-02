import assert from 'node:assert/strict';
import { test } from 'node:test';
import { complete, formatClock, isFinished, isSession, newSession, pause, progress, remainingMs, reset, start, switchMode } from '../src/lib/pomodoro.ts';

const T0 = Date.parse('2026-11-02T09:00:00Z');
const MIN = 60_000;

test('a new focus session is 25 minutes, stopped', () => {
  const s = newSession();
  assert.equal(s.mode, 'focus');
  assert.equal(remainingMs(s, T0), 25 * MIN);
  assert.equal(s.endsAt, null);
});

test('start counts down on the wall clock; pause keeps what is left; start resumes', () => {
  const running = start(newSession('focus', 't1'), T0);
  assert.equal(remainingMs(running, T0 + 10 * MIN), 15 * MIN);
  assert.equal(progress(running, T0 + 10 * MIN), 0.4);
  const paused = pause(running, T0 + 10 * MIN);
  assert.equal(remainingMs(paused, T0 + 60 * MIN), 15 * MIN, 'paused time does not move');
  assert.equal(remainingMs(start(paused, T0 + 60 * MIN), T0 + 65 * MIN), 10 * MIN);
});

test('finished only when running and at zero; reset and switchMode stop at full length', () => {
  const running = start(newSession(), T0);
  assert.equal(isFinished(running, T0 + 24 * MIN), false);
  assert.equal(isFinished(running, T0 + 26 * MIN), true);
  assert.equal(remainingMs(running, T0 + 26 * MIN), 0, 'never negative');
  assert.equal(remainingMs(reset(running), T0 + 26 * MIN), 25 * MIN);
  const brk = switchMode(running, 'short');
  assert.deepEqual([brk.mode, brk.endsAt, remainingMs(brk, T0)], ['short', null, 5 * MIN]);
});

test('complete: focus credits the task and goes to a break, every 4th a long one; a break goes back to focus', () => {
  let s = newSession('focus', 't1');
  const modes: string[] = [];
  let credits = 0;
  for (let i = 0; i < 8; i++) {
    const { next, credit } = complete(s);
    if (credit) credits += 1;
    modes.push(next.mode);
    s = next;
  }
  assert.deepEqual(modes, ['short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus']);
  assert.equal(credits, 4);
  assert.equal(s.taskId, 't1', 'the focus task carries over');
  assert.equal(s.endsAt, null, 'the next round waits for Start');
});

test('formatClock rounds up so the last second shows 0:01', () => {
  assert.equal(formatClock(25 * MIN), '25:00');
  assert.equal(formatClock(299_500), '5:00');
  assert.equal(formatClock(500), '0:01');
  assert.equal(formatClock(0), '0:00');
});

test('isSession rejects bad stored values', () => {
  assert.equal(isSession(newSession()), true);
  assert.equal(isSession({ ...newSession(), mode: 'nap' }), false);
  assert.equal(isSession({ ...newSession(), remainingMs: -1 }), false);
  assert.equal(isSession(null), false);
});
