import { PLACES, placeOf, sizeOf, type Note, type Place, type Tag } from './notes.ts';

/** Session Tasks layout rules. Pure: `today` is injected as a `YYYY-MM-DD` key. */

export type PlaceView = { place: Place; tasks: Note[]; points: number; open: number };

/** In the Done bucket, tasks finished within this many days are listed; older ones fold into "Earlier". */
export const DONE_FRESH_DAYS = 7;

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const lastChange = (n: Note) => n.movedAt ?? n.createdAt;
/** Doing first, then Blocked, then To do (done tasks live in the Done bucket). */
const STATUS_ORDER: Record<Tag, number> = { doing: 0, blocker: 1, todo: 2, done: 3 };

const isFresh = (n: Note, today: string) => n.tag !== 'done' || toUtc(n.day) >= toUtc(today) - DONE_FRESH_DAYS * DAY_MS;
const order = (a: Note, b: Note) => STATUS_ORDER[a.tag] - STATUS_ORDER[b.tag] || lastChange(b).localeCompare(lastChange(a));

/** Unsorted plus the four quadrants, with open work only: finishing a task clears it from its quadrant. */
export function places(notes: Note[]): PlaceView[] {
  const open = notes.filter((n) => n.tag !== 'done').sort(order);
  return PLACES.map((place) => {
    const tasks = open.filter((n) => placeOf(n) === place);
    return { place, tasks, open: tasks.length, points: tasks.reduce((sum, n) => sum + sizeOf(n), 0) };
  });
}

/** One list of open work, by place (Unsorted, Q1 … Q4). */
export function listView(notes: Note[]): Note[] {
  const rank = (n: Note) => PLACES.indexOf(placeOf(n));
  return notes.filter((n) => n.tag !== 'done').sort((a, b) => rank(a) - rank(b) || order(a, b));
}

/** The Done bucket: newest finished first; older than a week in `earlier`. Each can be restored to its quadrant. */
export function doneBucket(notes: Note[], today: string): { recent: Note[]; earlier: Note[] } {
  const done = notes.filter((n) => n.tag === 'done').sort((a, b) => lastChange(b).localeCompare(lastChange(a)));
  return { recent: done.filter((n) => isFresh(n, today)), earlier: done.filter((n) => !isFresh(n, today)) };
}

/** The "8/12" badge: done out of everything on screen. */
export function progressCount(notes: Note[], today: string): { done: number; total: number } {
  const visible = notes.filter((n) => isFresh(n, today));
  return { done: visible.filter((n) => n.tag === 'done').length, total: visible.length };
}
