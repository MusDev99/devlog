import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

/** All TypeScript files under api/. */
function files(dir = new URL('../api/', import.meta.url)): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(new URL(`${e.name}/`, dir)) : e.name.endsWith('.ts') ? [new URL(e.name, dir)] : [],
  );
}

/**
 * Vercel runs api/ as ES modules: Node needs the extension on every relative import, and it must be the
 * compiled `.js` (an extensionless import crashed every function with FUNCTION_INVOCATION_FAILED).
 */
test('api/: every relative import ends in .js', () => {
  const bad = files().flatMap((url) =>
    [...readFileSync(url, 'utf8').matchAll(/from '(\.{1,2}\/[^']+)'/g)]
      .map((m) => m[1] ?? '')
      .filter((spec) => !spec.endsWith('.js'))
      .map((spec) => `${url.pathname.split('/api/')[1]}: ${spec}`),
  );
  assert.deepEqual(bad, []);
});

/** Shared code that api/ pulls from src/ must not import values itself (its `.ts` paths do not exist once compiled). */
test('src modules used by api/ have type-only imports', () => {
  for (const name of ['notes', 'timing', 'targets']) {
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
    const valueImports = [...source.matchAll(/^import (?!type )[^;]+;$/gm)].map((m) => m[0]);
    assert.deepEqual(valueImports, [], name);
  }
});
