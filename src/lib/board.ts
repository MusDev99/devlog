import { TAGS, type Note, type Tag } from './notes.ts';

/** Board layout rules. Pure: `today` is injected as a `YYYY-MM-DD` key. */

export type Column = { tag: Tag; cards: Note[]; earlier: Note[] };

/** Done cards older than this fold into "Earlier" so the column stays short (Miller). */
export const DONE_FRESH_DAYS = 7;

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const lastChange = (n: Note) => n.movedAt ?? n.createdAt;

/** Columns in board order, newest change first; old Done cards go to `earlier`. */
export function boardColumns(notes: Note[], today: string): Column[] {
  const sorted = [...notes].sort((a, b) => lastChange(b).localeCompare(lastChange(a)));
  const cutoff = toUtc(today) - DONE_FRESH_DAYS * DAY_MS;
  return TAGS.map((tag) => {
    const cards = sorted.filter((n) => n.tag === tag);
    if (tag !== 'done') return { tag, cards, earlier: [] };
    return {
      tag,
      cards: cards.filter((n) => toUtc(n.day) >= cutoff),
      earlier: cards.filter((n) => toUtc(n.day) < cutoff),
    };
  });
}

/** "Today", "Yesterday" or "28 Oct" for a card's last change. */
export function shortDay(day: string, today: string): string {
  const diff = Math.round((toUtc(today) - toUtc(day)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(toUtc(day));
}
