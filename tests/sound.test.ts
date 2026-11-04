import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPlayer, parseSound, type ContextLike } from '../src/lib/sound.ts';

function fakeAudio(over: Partial<{ state: string; fail: boolean; notOk: boolean }> = {}) {
  const log: string[] = [];
  let fetched = 0;
  let decodes = 0;
  const ctx: ContextLike = {
    state: over.state ?? 'running',
    destination: 'out',
    resume: async () => void log.push('resume'),
    decodeAudioData: async () => (decodes++, over.fail ? Promise.reject(new Error('bad')) : 'buf'),
    createBufferSource: () => ({ buffer: null, connect: () => log.push('src.connect'), start: () => log.push('start') }),
    createGain: () => ({ gain: { value: 1 }, connect: () => log.push('gain.connect') }),
  };
  const fetchFn = async () => (fetched++, { ok: !over.notOk, arrayBuffer: async () => new ArrayBuffer(8) });
  return { ctx, log, fetchFn, count: () => ({ fetched, decodes }) };
}

test('play: decodes once, then starts a source through a gain', async () => {
  const a = fakeAudio();
  const p = createPlayer({ url: '/x.mp3', makeContext: () => a.ctx, fetchFn: a.fetchFn });
  assert.equal(await p.play(), true);
  assert.equal(await p.play(), true);
  assert.deepEqual(a.count(), { fetched: 1, decodes: 1 });
  assert.deepEqual(a.log.filter((l) => l === 'start').length, 2);
});

test('a suspended context is resumed inside the play call', async () => {
  const a = fakeAudio({ state: 'suspended' });
  const p = createPlayer({ url: '/x.mp3', makeContext: () => a.ctx, fetchFn: a.fetchFn });
  await p.play();
  assert.ok(a.log.includes('resume'));
});

test('turned off: nothing is fetched or played', async () => {
  const a = fakeAudio();
  const p = createPlayer({ url: '/x.mp3', makeContext: () => a.ctx, fetchFn: a.fetchFn });
  p.setEnabled(false);
  assert.equal(await p.play(), false);
  assert.deepEqual(a.count(), { fetched: 0, decodes: 0 });
  assert.equal(p.enabled, false);
});

test('no Web Audio: silent and not available', async () => {
  const p = createPlayer({ url: '/x.mp3', makeContext: () => null, fetchFn: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }) });
  assert.equal(p.available, false);
  assert.equal(await p.play(), false);
  assert.equal(await p.preload(), false);
});

test('a context that throws on creation is treated as unavailable', async () => {
  const p = createPlayer({ url: '/x.mp3', makeContext: () => { throw new Error('nope'); }, fetchFn: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }) });
  assert.equal(p.available, false);
  assert.equal(await p.play(), false);
});

test('offline or undecodable: play returns false without throwing, and the next play retries', async () => {
  const bad = fakeAudio({ notOk: true });
  const p = createPlayer({ url: '/x.mp3', makeContext: () => bad.ctx, fetchFn: bad.fetchFn });
  assert.equal(await p.play(), false);
  assert.equal(await p.play(), false);
  assert.equal(bad.count().fetched, 2, 'a failure is not cached');
  const broken = fakeAudio({ fail: true });
  const q = createPlayer({ url: '/x.mp3', makeContext: () => broken.ctx, fetchFn: broken.fetchFn });
  assert.equal(await q.play(), false);
});

test('preload decodes ahead so the first play does not fetch again', async () => {
  const a = fakeAudio();
  const p = createPlayer({ url: '/x.mp3', makeContext: () => a.ctx, fetchFn: a.fetchFn });
  assert.equal(await p.preload(), true);
  await p.play();
  assert.deepEqual(a.count(), { fetched: 1, decodes: 1 });
});

test('preference: on unless explicitly "off"', () => {
  assert.equal(parseSound(null), true);
  assert.equal(parseSound('off'), false);
  assert.equal(parseSound('on'), true);
});
