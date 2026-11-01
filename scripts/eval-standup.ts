/**
 * Live golden-set eval for the AI standup: calls Claude directly (costs API credit, not run in CI).
 *   ANTHROPIC_API_KEY=... npm run eval
 * Pass per case: usable output, zero dropped items (nothing invented or mis-cited), every blocker kept.
 */
import { readFileSync } from 'node:fs';
import { generateStandup } from '../api/_lib/standup-model';
import type { PromptNote } from '../src/lib/standup';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Set ANTHROPIC_API_KEY');
  process.exit(2);
}

const cases = JSON.parse(readFileSync('tests/golden/standup-cases.json', 'utf8')) as { name: string; notes: PromptNote[] }[];

let failed = 0;
for (const c of cases) {
  const result = await generateStandup(c.notes).catch(() => null);
  const blockerNotes = c.notes.filter((n) => n.tag === 'blocker').length;
  const ok = result !== null && result.dropped === 0 && result.standup.blockers.length >= blockerNotes;
  if (!ok) failed += 1;
  console.log(`${ok ? '✅' : '❌'} ${c.name} (dropped ${result?.dropped ?? 'n/a'})`);
  if (result) console.log(`   ${JSON.stringify(result.standup)}`);
}
console.log(`${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
