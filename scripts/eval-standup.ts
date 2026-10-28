/**
 * Live golden-set eval for the AI standup (costs API credit, not run in CI).
 *   DEVLOG_URL=https://<deploy> DEVLOG_PASSCODE=... npm run eval
 * Pass criteria per case: HTTP 200, valid standup, zero dropped (no invented or mis-cited items),
 * and every blocker note present.
 */
import { readFileSync } from 'node:fs';
import type { PromptNote } from '../src/lib/standup.ts';

const url = process.env.DEVLOG_URL;
const passcode = process.env.DEVLOG_PASSCODE;
if (!url || !passcode) {
  console.error('Set DEVLOG_URL and DEVLOG_PASSCODE');
  process.exit(2);
}

const cases = JSON.parse(readFileSync(new URL('../tests/golden/standup-cases.json', import.meta.url), 'utf8')) as {
  name: string;
  notes: PromptNote[];
}[];

let failed = 0;
for (const c of cases) {
  const res = await fetch(new URL('/api/standup', url), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-devlog-passcode': passcode },
    body: JSON.stringify({ notes: c.notes }),
  });
  const body = (await res.json().catch(() => ({}))) as { standup?: { blockers: string[] }; dropped?: number };
  const blockerCount = c.notes.filter((n) => n.tag === 'blocker').length;
  const ok = res.status === 200 && body.dropped === 0 && (body.standup?.blockers.length ?? -1) >= blockerCount;
  if (!ok) failed += 1;
  console.log(`${ok ? '✅' : '❌'} ${c.name} (status ${res.status}, dropped ${body.dropped ?? '?'})`);
}
console.log(`${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
