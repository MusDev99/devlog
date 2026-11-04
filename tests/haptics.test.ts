import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buzz, canVibrate, parseHaptics, PATTERNS, setHaptics, type Haptic } from '../src/lib/haptics.ts';

const spy = () => {
  const calls: Array<number | number[]> = [];
  return { calls, vibrate: (p: number | number[]) => (calls.push(p), true) };
};

test('each kind sends its own pattern', () => {
  setHaptics(true);
  const nav = spy();
  for (const kind of ['start', 'stop', 'finish', 'grab'] as Haptic[]) assert.equal(buzz(kind, nav), true);
  assert.deepEqual(nav.calls, [PATTERNS.start, PATTERNS.stop, PATTERNS.finish, PATTERNS.grab]);
});

test('start, stop and finish feel different from each other', () => {
  const seen = new Set([PATTERNS.start, PATTERNS.stop, PATTERNS.finish].map((p) => JSON.stringify(p)));
  assert.equal(seen.size, 3);
});

test('patterns are short: nothing buzzes longer than a quarter second in total', () => {
  for (const p of Object.values(PATTERNS)) {
    const total = Array.isArray(p) ? p.reduce((a, n) => a + n, 0) : p;
    assert.ok(total > 0 && total <= 250, JSON.stringify(p));
  }
});

test('turned off: nothing is sent', () => {
  const nav = spy();
  setHaptics(false);
  assert.equal(buzz('start', nav), false);
  assert.deepEqual(nav.calls, []);
  setHaptics(true);
});

test('no Vibration API (iPhone, desktop): silent, no error', () => {
  setHaptics(true);
  assert.equal(canVibrate({}), false);
  assert.equal(canVibrate(undefined), false);
  assert.equal(buzz('start', {}), false);
  assert.equal(buzz('start', undefined), false);
});

test('a browser that throws or refuses does not break the app', () => {
  setHaptics(true);
  assert.equal(buzz('stop', { vibrate: () => { throw new Error('blocked'); } }), false);
  assert.equal(buzz('stop', { vibrate: () => false }), false);
});

test('preference: on unless explicitly "off"', () => {
  assert.equal(parseHaptics(null), true);
  assert.equal(parseHaptics('on'), true);
  assert.equal(parseHaptics('off'), false);
  assert.equal(parseHaptics(''), true);
});
