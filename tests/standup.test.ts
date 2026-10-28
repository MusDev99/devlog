import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Note } from '../src/lib/notes.ts';
import { formatStandup, groundStandup, ruleStandup, toPromptNotes, type PromptNote } from '../src/lib/standup.ts';

const note = (text: string, tag: Note['tag'], day: string, minute = 0): Note => ({
  id: `${day}-${text}`,
  text,
  tag,
  day,
  createdAt: `${day}T01:${String(minute).padStart(2, '0')}:00Z`,
});

test('rules: yesterday from the previous workday, blockers from both days', () => {
  const prev = [note('Fixed test', 'done', '2026-10-27'), note('Seat map', 'doing', '2026-10-27'), note('IAM access', 'blocker', '2026-10-27')];
  const today = [note('Pub/Sub DLQ', 'doing', '2026-10-28'), note('VPN down', 'blocker', '2026-10-28')];
  assert.deepEqual(ruleStandup(prev, today), {
    yesterday: ['Fixed test', 'Seat map'],
    today: ['Pub/Sub DLQ'],
    blockers: ['IAM access', 'VPN down'],
  });
});

test('rules: with no notes yet today, unfinished doing items carry over', () => {
  const prev = [note('Runbook', 'doing', '2026-10-27'), note('PR review', 'done', '2026-10-27')];
  assert.deepEqual(ruleStandup(prev, []).today, ['Runbook']);
});

test('prompt notes get stable refs in time order', () => {
  const refs = toPromptNotes([note('b', 'done', '2026-10-27', 2), note('a', 'done', '2026-10-27', 1)], [note('c', 'doing', '2026-10-28')]);
  assert.deepEqual(refs.map((r) => `${r.ref}:${r.text}:${r.when}`), ['N1:a:previous', 'N2:b:previous', 'N3:c:today']);
});

const notes: PromptNote[] = [
  { ref: 'N1', tag: 'done', when: 'previous', text: 'Deployed fare cache' },
  { ref: 'N2', tag: 'blocker', when: 'previous', text: 'Waiting on IAM' },
  { ref: 'N3', tag: 'blocker', when: 'today', text: 'VPN down' },
];

test('grounding drops invented items and items citing unknown notes', () => {
  const { standup, dropped } = groundStandup(
    {
      yesterday: [{ text: 'Deployed the fare cache', refs: ['N1'] }, { text: 'Launched rockets', refs: [] }],
      today: [{ text: 'Rewrote billing', refs: ['N9'] }],
      blockers: [{ text: 'Waiting on IAM access', refs: ['N2'] }],
    },
    notes,
  );
  assert.equal(dropped, 2);
  assert.deepEqual(standup.yesterday, ['Deployed the fare cache']);
  assert.deepEqual(standup.today, []);
  assert.deepEqual(standup.blockers, ['Waiting on IAM access', 'VPN down'], 'missing blocker added back');
});

test('grounding rejects a blocker item that cites a non-blocker note', () => {
  const { standup, dropped } = groundStandup({ yesterday: [], today: [], blockers: [{ text: 'x', refs: ['N1'] }] }, notes);
  assert.equal(dropped, 1);
  assert.deepEqual(standup.blockers, ['Waiting on IAM', 'VPN down']);
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
    notes: PromptNote[];
  }[];
  assert.ok(cases.length >= 10);
  for (const c of cases) {
    const toNote = (n: PromptNote, i: number): Note => ({ ...n, id: n.ref, day: n.when, createdAt: String(i).padStart(4, '0') });
    const prev = c.notes.map(toNote).filter((n) => n.day === 'previous');
    const today = c.notes.map(toNote).filter((n) => n.day === 'today');
    const s = ruleStandup(prev, today);
    const texts = new Set(c.notes.map((n) => n.text));
    for (const item of [...s.yesterday, ...s.today, ...s.blockers]) assert.ok(texts.has(item), `${c.name}: invented "${item}"`);
    for (const b of c.notes.filter((n) => n.tag === 'blocker')) assert.ok(s.blockers.includes(b.text), `${c.name}: lost blocker`);
  }
});
