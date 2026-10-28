import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLimiter, passcodeMatches } from '../api/_lib/guard.ts';

test('passcode: fails closed when unset or missing', () => {
  assert.equal(passcodeMatches('x', undefined), false);
  assert.equal(passcodeMatches(null, 'secret'), false);
  assert.equal(passcodeMatches('', 'secret'), false);
});

test('passcode: exact match only, any length', () => {
  assert.equal(passcodeMatches('secret', 'secret'), true);
  assert.equal(passcodeMatches('secret ', 'secret'), false);
  assert.equal(passcodeMatches('a-much-longer-guess', 'secret'), false);
});

test('limiter allows N per window, then resets', () => {
  const allow = createLimiter(2, 1000);
  assert.deepEqual([allow('ip', 0), allow('ip', 10), allow('ip', 20), allow('other', 20)], [true, true, false, true]);
  assert.equal(allow('ip', 1000), true);
});
