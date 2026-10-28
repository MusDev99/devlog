import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

type Strategy = 'network-only' | 'network-first' | 'cache-first';
type Policy = { strategyFor(request: { url: string; method: string; mode: string }): Strategy };

const ORIGIN = 'https://devlog.example';
const sandbox: { self: { location: URL; swPolicy?: Policy }; URL: typeof URL } = {
  self: { location: new URL(ORIGIN) },
  URL,
};
runInNewContext(readFileSync(new URL('../public/sw-policy.js', import.meta.url), 'utf8'), sandbox);
const policy = sandbox.self.swPolicy as Policy;

const get = (path: string, mode = 'no-cors') => ({ url: ORIGIN + path, method: 'GET', mode });

test('API calls and writes are never cached', () => {
  assert.equal(policy.strategyFor(get('/api/standup')), 'network-only');
  assert.equal(policy.strategyFor({ url: `${ORIGIN}/`, method: 'POST', mode: 'cors' }), 'network-only');
  assert.equal(policy.strategyFor({ url: 'https://other.example/x.js', method: 'GET', mode: 'cors' }), 'network-only');
});

test('pages go network first so updates arrive, cache when offline', () => {
  assert.equal(policy.strategyFor(get('/', 'navigate')), 'network-first');
});

test('content-hashed assets and icons are cache first', () => {
  assert.equal(policy.strategyFor(get('/assets/index-abc123.js')), 'cache-first');
  assert.equal(policy.strategyFor(get('/icons/icon-192.png')), 'cache-first');
});
