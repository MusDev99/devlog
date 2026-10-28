import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { precacheList } from '../build/sw-assets.ts';

test('only hashed JS, CSS and fonts are precached', () => {
  assert.deepEqual(precacheList(['index.html', 'assets/index-a1.js', 'assets/index-b2.css', 'assets/logo.png', 'sw.js']), [
    '/assets/index-a1.js',
    '/assets/index-b2.css',
  ]);
});

test('every file in the sw shell and manifest exists in public/', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  const shell = [...(sw.match(/const SHELL = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '');
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')) as {
    icons: { src: string }[];
  };
  const files = [...shell.filter((p) => p !== '/'), ...manifest.icons.map((i) => i.src)];
  const missing = files.filter((p) => !existsSync(new URL(`../public${p}`, import.meta.url)));
  assert.deepEqual(missing, []);
});
