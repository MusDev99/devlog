import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Note } from '../src/lib/notes.ts';
import { formatStandup, ruleStandup } from '../src/lib/standup.ts';

type GoldenNote = { ref: string; tag: Note['tag']; when: 'previous' | 'today'; text: string };

const note = (text: string, tag: Note['tag'], day: string, minute = 0): Note => ({
  id: `${day}-${text}`,
  text,
  tag,
  day,
  createdAt: `${day}T01:${String(minute).padStart(2, '0')}:00Z`,
});

const TODAY = '2026-10-28';

test('rules: yesterday from the last active day, today = finished today + still doing, all blockers', () => {
  const board = [
    note('Fixed test', 'done', '2026-10-27'),
    note('Seat map', 'doing', '2026-10-27'),
    note('IAM access', 'blocker', '2026-10-27'),
    note('Shipped fare cache', 'done', TODAY),
    note('Pub/Sub DLQ', 'doing', TODAY, 1),
    note('VPN down', 'blocker', TODAY),
    note('Write runbook', 'todo', TODAY),
  ];
  assert.deepEqual(ruleStandup(board, TODAY), {
    yesterday: ['Fixed test', 'Seat map'],
    today: ['Shipped fare cache', 'Seat map', 'Pub/Sub DLQ'],
    blockers: ['IAM access', 'VPN down'],
  });
});

test('rules: weekends are skipped and old done cards stay out', () => {
  const board = [note('Old', 'done', '2026-10-20'), note('Friday work', 'done', '2026-10-23'), note('Runbook', 'doing', '2026-10-23')];
  const s = ruleStandup(board, '2026-10-26');
  assert.deepEqual(s.yesterday, ['Friday work', 'Runbook']);
  assert.deepEqual(s.today, ['Runbook'], 'unfinished doing carries over');
});

test('formatStandup is paste-ready', () => {
  assert.equal(
    formatStandup({ yesterday: ['A'], today: [], blockers: ['B'] }),
    'Yesterday\n- A\n\nToday\n- None\n\nBlockers\n- B',
  );
});

test('golden cases: rules keep every blocker and invent nothing', () => {
  const cases = JSON.parse(readFileSync(new URL('./golden/standup-cases.json', import.meta.url), 'utf8')) as {
    name: string;
    notes: GoldenNote[];
  }[];
  assert.ok(cases.length >= 10);
  for (const c of cases) {
    const day = { previous: '2026-10-27', today: TODAY };
    const toNote = (n: GoldenNote, i: number): Note => ({ id: n.ref, text: n.text, tag: n.tag, day: day[n.when], createdAt: String(i).padStart(4, '0') });
    const s = ruleStandup(c.notes.map(toNote), TODAY);
    const texts = new Set(c.notes.map((n) => n.text));
    for (const item of [...s.yesterday, ...s.today, ...s.blockers]) assert.ok(texts.has(item), `${c.name}: invented "${item}"`);
    for (const b of c.notes.filter((n) => n.tag === 'blocker')) assert.ok(s.blockers.includes(b.text), `${c.name}: lost blocker`);
  }
});
