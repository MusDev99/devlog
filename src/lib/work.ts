import { elapsedMs, sizeOf, SIZES, type Note, type Size } from './notes.ts';
import { sourceOf, type Source } from './links.ts';
import { datedRuns } from './stats.ts';
import { dayKey } from './today.ts';

/** Developer views of the same data: where time went by ticket / repo, and whether story points track effort. Pure. */

const DAY_MS = 86_400_000;
const shiftDay = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY_MS).toISOString().slice(0, 10);

export type Stream = { source: Source; ms: number; share: number; tasks: number; done: number; points: number };
export type Streams = { totalMs: number; linkedMs: number; streams: Stream[] };

/** Time of the `count` days ending `today` grouped by the first link in each task's text (a Jira ticket, a GitHub repo, a site), largest first. */
export function streams(notes: Note[], nowMs: number, timeZone: string, today: string, count = 7): Streams {
  const from = shiftDay(today, -count + 1);
  const perTask = new Map<Note, number>();
  for (const r of datedRuns(notes, nowMs)) {
    const day = dayKey(new Date(r.start), timeZone);
    if (day >= from && day <= today) perTask.set(r.note, (perTask.get(r.note) ?? 0) + r.ms);
  }
  const groups = new Map<string, { source: Source; ms: number; notes: Note[] }>();
  let totalMs = 0;
  let linkedMs = 0;
  for (const [note, ms] of perTask) {
    totalMs += ms;
    const source = sourceOf(note.text);
    if (!source || ms <= 0) continue;
    linkedMs += ms;
    const g = groups.get(source.key) ?? { source, ms: 0, notes: [] };
    g.ms += ms;
    g.notes.push(note);
    groups.set(source.key, g);
  }
  const list = [...groups.values()]
    .map((g) => {
      const done = g.notes.filter((n) => n.tag === 'done');
      return { source: g.source, ms: g.ms, share: totalMs ? g.ms / totalMs : 0, tasks: g.notes.length, done: done.length, points: done.reduce((s, n) => s + sizeOf(n), 0) };
    })
    .sort((a, b) => b.ms - a.ms);
  return { totalMs, linkedMs, streams: list };
}

export type SizeRow = { size: Size; tasks: number; avgMs: number };
export type Sizing = { rows: SizeRow[]; verdict: 'tracks' | 'drifts' | null; example: [Size, Size] | null };

/** Finished, timed tasks (5 min or more) of the `count` days ending `today`: the average time per story-point size. */
export function sizing(notes: Note[], nowMs: number, today: string, count = 28): Sizing {
  const from = shiftDay(today, -count + 1);
  const rows = SIZES.map((size) => {
    const mine = notes.filter((n) => n.tag === 'done' && n.day >= from && n.day <= today && sizeOf(n) === size && elapsedMs(n, nowMs) >= 5 * 60_000);
    return { size, tasks: mine.length, avgMs: mine.length ? mine.reduce((s, n) => s + elapsedMs(n, nowMs), 0) / mine.length : 0 };
  }).filter((r) => r.tasks > 0);
  if (rows.length < 3) return { rows, verdict: null, example: null };
  // Sizes are in ascending order: a bigger size that averaged clearly less than a smaller one is a drift.
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const next = rows[i];
    if (prev && next && next.avgMs < prev.avgMs * 0.9) return { rows, verdict: 'drifts', example: [prev.size, next.size] };
  }
  return { rows, verdict: 'tracks', example: null };
}
