import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isIos, launchParams } from '../src/lib/launch.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

type Manifest = {
  id: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { purpose?: string }[];
  shortcuts: { url: string }[];
};
const manifest = JSON.parse(read('../public/manifest.webmanifest')) as Manifest;

test('launchParams: a shortcut opens its screen; unknown screens are ignored', () => {
  assert.deepEqual(launchParams('?screen=stats'), { screen: 'stats', newTask: false });
  assert.deepEqual(launchParams('?screen=tasks&new=1'), { screen: 'tasks', newTask: true });
  assert.deepEqual(launchParams('?screen=admin'), { screen: null, newTask: false });
  assert.deepEqual(launchParams(''), { screen: null, newTask: false });
});

test('isIos: iPhone, iPad (also when it reports as a Mac with touch), not desktop Mac or Android', () => {
  assert.equal(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5), true);
  assert.equal(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), true);
  assert.equal(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0), false);
  assert.equal(isIos('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5), false);
});

test('manifest: installable standalone app with an id, a maskable icon, and colours that match the design tokens', () => {
  assert.equal(manifest.id, '/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  const bg = read('../src/styles.css').match(/--color-bg:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.equal(manifest.theme_color, bg, 'theme_color = --color-bg');
  assert.equal(manifest.background_color, bg, 'background_color = --color-bg (splash screen)');
  assert.match(read('../index.html'), new RegExp(`name="theme-color" content="${bg}"`));
});

test('manifest shortcuts all open a real screen', () => {
  assert.ok(manifest.shortcuts.length >= 3);
  for (const s of manifest.shortcuts) assert.notEqual(launchParams(new URL(s.url, 'https://x').search).screen, null, s.url);
});

test('service worker waits for the app before swapping in a new version', () => {
  const sw = read('../public/sw.js');
  assert.match(sw, /if \(!self\.registration\.active\) await self\.skipWaiting\(\)/, 'only the first install skips waiting');
  assert.match(sw, /event\.data === 'skip-waiting'/);
});

test('service worker matches cached files ignoring Vary, so crossorigin assets load offline', () => {
  const sw = read('../public/sw.js');
  assert.match(sw, /const MATCH = \{ ignoreVary: true \}/);
  const lookups = sw.match(/caches\.match\([^)]*\)/g) ?? [];
  assert.ok(lookups.length >= 2);
  for (const call of lookups) assert.match(call, /MATCH\)$/, call);
});
