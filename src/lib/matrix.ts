import { PLACES, placeOf, sizeOf, type Note, type Place, type Tag } from './notes.ts';

/** Session Tasks layout rules. Pure: `today` is injected as a `YYYY-MM-DD` key. */

export type PlaceView = { place: Place; tasks: Note[]; points: number; open: number };

/** Done tasks stay crossed out in their place for this long, then only the List's "Earlier" shows them. */
export const DONE_FRESH_DAYS = 7;

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const lastChange = (n: Note) => n.movedAt ?? n.createdAt;
/** Open work first (Doing, Blocked, To do), finished last. */
const STATUS_ORDER: Record<Tag, number> = { doing: 0, blocker: 1, todo: 2, done: 3 };

const isFresh = (n: Note, today: string) => n.tag !== 'done' || toUtc(n.day) >= toUtc(today) - DONE_FRESH_DAYS * DAY_MS;
const order = (a: Note, b: Note) => STATUS_ORDER[a.tag] - STATUS_ORDER[b.tag] || lastChange(b).localeCompare(lastChange(a));

/** Unsorted plus the four quadrants, each with its open work first and this week's done after. */
export function places(notes: Note[], today: string): PlaceView[] {
  const visible = notes.filter((n) => isFresh(n, today)).sort(order);
  return PLACES.map((place) => {
    const tasks = visible.filter((n) => placeOf(n) === place);
    const open = tasks.filter((n) => n.tag !== 'done');
    return { place, tasks, open: open.length, points: open.reduce((sum, n) => sum + sizeOf(n), 0) };
  });
}

/** One list: open work by place (Unsorted, Q1 … Q4), then this week's done; older done in `earlier`. */
export function listView(notes: Note[], today: string): { tasks: Note[]; earlier: Note[] } {
  const rank = (n: Note) => PLACES.indexOf(placeOf(n));
  const open = notes.filter((n) => n.tag !== 'done').sort((a, b) => rank(a) - rank(b) || order(a, b));
  const done = notes.filter((n) => n.tag === 'done').sort(order);
  return { tasks: [...open, ...done.filter((n) => isFresh(n, today))], earlier: done.filter((n) => !isFresh(n, today)) };
}

/** The "8/12" badge: done out of everything on screen. */
export function progressCount(notes: Note[], today: string): { done: number; total: number } {
  const visible = notes.filter((n) => isFresh(n, today));
  return { done: visible.filter((n) => n.tag === 'done').length, total: visible.length };
}
