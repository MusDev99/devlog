import assert from 'node:assert/strict';
import { test } from 'node:test';
import { armed, commitOf, lockAxis, pull, threshold } from '../src/lib/swipe.ts';

const both = { left: true, right: true };
const leftOnly = { left: true, right: false };

test('lockAxis waits for 8 px, then splits scroll from swipe', () => {
  assert.equal(lockAxis(3, 4), null);
  assert.equal(lockAxis(12, 3), 'x');
  assert.equal(lockAxis(-12, 3), 'x');
  assert.equal(lockAxis(4, 12), 'y');
  // a diagonal that is not clearly sideways stays a scroll
  assert.equal(lockAxis(10, 9), 'y');
});

test('threshold is 30% of the row within 72-160 px', () => {
  assert.equal(threshold(200), 72);
  assert.equal(threshold(375), 112.5);
  assert.equal(threshold(1000), 160);
});

test('pull follows the finger to the threshold, then at 35%', () => {
  const t = threshold(375);
  assert.equal(pull(50, 375, both), 50);
  assert.equal(pull(-50, 375, both), -50);
  assert.equal(pull(t + 100, 375, both), t + 35);
  assert.equal(pull(0, 375, both), 0);
});

test('a direction with no action resists and stops at 24 px', () => {
  assert.equal(pull(100, 375, leftOnly), 15);
  assert.equal(pull(1000, 375, leftOnly), 24);
});

test('a row never travels past 60% of its width', () => {
  assert.equal(pull(5000, 100, both), 60);
});

test('armed only past the threshold and only for an allowed direction', () => {
  assert.equal(armed(50, 375, both), false);
  assert.equal(armed(120, 375, both), true);
  assert.equal(armed(-120, 375, both), true);
  assert.equal(armed(120, 375, leftOnly), false);
});

test('commit: past the threshold acts, short of it springs back', () => {
  assert.equal(commitOf(130, 375, 0, both), 'right');
  assert.equal(commitOf(-130, 375, 0, both), 'left');
  assert.equal(commitOf(60, 375, 0.1, both), null);
});

test('commit: a quick flick acts early, but not from a tiny move or against the direction', () => {
  assert.equal(commitOf(60, 375, 0.9, both), 'right');
  assert.equal(commitOf(-60, 375, -0.9, both), 'left');
  assert.equal(commitOf(20, 375, 0.9, both), null);
  assert.equal(commitOf(60, 375, -0.9, both), null);
});

test('commit: a dead direction never acts', () => {
  assert.equal(commitOf(300, 375, 2, leftOnly), null);
  assert.equal(commitOf(0, 375, 2, both), null);
});
