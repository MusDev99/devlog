import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceOf } from '../src/lib/links.ts';
import type { Note } from '../src/lib/notes.ts';
import { insights } from '../src/lib/stats.ts';
import { DEFAULT_TARGETS } from '../src/lib/targets.ts';
import { sizing, streams } from '../src/lib/work.ts';

const TODAY = '2026-11-02';
const NOW = Date.parse('2026-11-02T12:00:00Z');
const MIN = 60_000;
const task = (id: string, extra: Partial<Note> = {}): Note => ({ id, text: id, tag: 'todo', createdAt: '2026-10-30T08:00:00Z', day: '2026-10-30', ...extra });
const run = (iso: string, minutes: number) => ({ s: iso, e: new Date(Date.parse(iso) + minutes * MIN).toISOString() });
const JIRA = 'https://airasia.atlassian.net/browse/SKYIQ-101';

test('sourceOf: a Jira ticket, a GitHub repo (PRs and issues group), a site, or nothing', () => {
  assert.deepEqual(sourceOf(`fix ${JIRA} today`), { kind: 'jira', key: 'jira:SKYIQ-101', label: 'SKYIQ-101', href: JIRA });
  assert.equal(sourceOf('see https://github.com/MusDev99/devlog/pull/7')?.label, 'MusDev99/devlog');
  assert.equal(sourceOf('see https://github.com/MusDev99/devlog/pull/7')?.key, sourceOf('https://github.com/musdev99/devlog/issues/9')?.key);
  assert.equal(sourceOf('read https://www.example.com/a/b')?.label, 'example.com');
  assert.equal(sourceOf('no link here'), null);
});

test('sourceOf uses only the first link of a task', () => {
  assert.equal(sourceOf(`${JIRA} and https://github.com/a/b`)?.kind, 'jira');
});

test('streams: time per ticket / repo, largest first, linked share, done points', () => {
  const notes = [
    task(`a ${JIRA}`, { tag: 'done', size: 3, runs: [run('2026-11-01T09:00:00Z', 60)] }),
    task(`b ${JIRA}`, { runs: [run('2026-11-02T09:00:00Z', 30)] }),
    task('c https://github.com/x/y/pull/1', { runs: [run('2026-11-01T14:00:00Z', 45)] }),
    task('d no link', { runs: [run('2026-11-01T16:00:00Z', 15)] }),
    task(`old ${JIRA}`, { runs: [run('2026-10-01T09:00:00Z', 999)] }),
  ];
  const r = streams(notes, NOW, 'UTC', TODAY);
  assert.equal(r.totalMs, 150 * MIN);
  assert.equal(r.linkedMs, 135 * MIN);
  assert.deepEqual(r.streams.map((s) => [s.source.label, s.ms / MIN, s.tasks, s.done, s.points]), [
    ['SKYIQ-101', 90, 2, 1, 3],
    ['x/y', 45, 1, 0, 0],
  ]);
});

test('sizing: sizes that grow with time track; a bigger size that took less drifts; too little data is silent', () => {
  const done = (id: string, size: 1 | 2 | 3 | 5 | 8, minutes: number): Note => task(id, { tag: 'done', size, day: '2026-11-01', spentMs: minutes * MIN });
  const good = sizing([done('a', 1, 10), done('b', 3, 40), done('c', 5, 90)], NOW, TODAY);
  assert.equal(good.verdict, 'tracks');
  const bad = sizing([done('a', 1, 10), done('b', 3, 60), done('c', 5, 20)], NOW, TODAY);
  assert.equal(bad.verdict, 'drifts');
  assert.deepEqual(bad.example, [3, 5]);
  assert.equal(sizing([done('a', 1, 10), done('b', 3, 40)], NOW, TODAY).verdict, null);
  // under 5 minutes is noise, and old work is outside the window
  assert.equal(sizing([done('a', 1, 2), task('o', { tag: 'done', size: 3, day: '2026-08-01', spentMs: 60 * MIN })], NOW, TODAY).rows.length, 0);
});

test('insights: three tasks in Doing raises a work-in-progress warning first', () => {
  const doing = ['a', 'b', 'c'].map((id) => task(id, { tag: 'doing' }));
  const first = insights(doing, NOW, 'UTC', TODAY, DEFAULT_TARGETS)[0];
  assert.equal(first?.tone, 'warn');
  assert.match(first?.text ?? '', /3 tasks are in Doing/);
  assert.equal(insights(doing.slice(0, 2), NOW, 'UTC', TODAY, DEFAULT_TARGETS).some((i) => /in Doing/.test(i.text)), false);
});
