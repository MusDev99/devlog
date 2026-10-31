import type { Note } from './notes.ts';

/** Friday recap: a week of notes summed up by tag rules. Pure and offline; nothing leaves the phone. */

export type Recap = { activeDays: number; shipped: string[]; inProgress: string[]; blockers: string[] };

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Monday of the week `day` falls in, through `day` itself (a Sunday looks back at its own week). */
export function weekRange(day: string): { start: string; end: string } {
  const ms = toUtc(day);
  const sinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return { start: toKey(ms - sinceMonday * DAY_MS), end: day };
}

/** Recap only on Friday and the weekend; the rest of the week the card stays a one-line link (Hick). */
export function isRecapDay(day: string): boolean {
  const weekday = new Date(toUtc(day)).getUTCDay();
  return weekday === 5 || weekday === 6 || weekday === 0;
}

/** Shipped = done notes. In progress = doing notes never later marked done (same text). Blockers = all, oldest first. */
export function weekRecap(notes: Note[]): Recap {
  const sorted = [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const key = (text: string) => text.toLowerCase();
  const unique = (items: string[]) => {
    const seen = new Set<string>();
    return items.filter((t) => !seen.has(key(t)) && seen.add(key(t)));
  };
  const texts = (tag: Note['tag']) => sorted.filter((n) => n.tag === tag).map((n) => n.text);
  const shipped = unique(texts('done'));
  const shippedKeys = new Set(shipped.map(key));
  return {
    activeDays: new Set(notes.map((n) => n.day)).size,
    shipped,
    inProgress: unique(texts('doing')).filter((t) => !shippedKeys.has(key(t))),
    blockers: unique(texts('blocker')),
  };
}

/** "27 Oct – 31 Oct" for the card and the copied text. */
export function rangeLabel(start: string, end: string): string {
  const fmt = (day: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(toUtc(day));
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

export function formatRecap(r: Recap, label: string): string {
  const section = (title: string, items: string[]) =>
    `${title}\n${items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '- None'}`;
  return [
    `Week recap (${label}, ${r.activeDays} ${r.activeDays === 1 ? 'day' : 'days'} logged)`,
    section('Shipped', r.shipped),
    section('In progress', r.inProgress),
    section('Blockers', r.blockers),
  ].join('\n\n');
}
