import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { API_ROUTES } from '../build/dev-api.ts';

/** Every Vercel function under api/ (not api/_lib) as its URL path. */
function functions(dir = new URL('../api/', import.meta.url), prefix = '/api'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('_')) return [];
    if (entry.isDirectory()) return functions(new URL(`${entry.name}/`, dir), `${prefix}/${entry.name}`);
    return entry.name.endsWith('.ts') ? [`${prefix}/${entry.name.replace(/\.ts$/, '')}`] : [];
  });
}

test('npm run dev serves every api/ function (and nothing else)', () => {
  assert.deepEqual(Object.keys(API_ROUTES).sort(), functions().sort());
  for (const [path, file] of Object.entries(API_ROUTES)) assert.equal(file, `${path}.ts`);
});
