import { elapsedMs, QUADRANTS, quadrantOf, sizeOf, type Note, type Quadrant, type Tag } from './notes.ts';

/** Dashboard layout rules. Pure: `today` and `nowMs` are injected. */

export type QuadrantView = { quadrant: Quadrant; tasks: Note[]; points: number; trackedMs: number };
export type Stats = { open: number; points: number; trackedMs: number };

/** Done tasks older than this fold into "Earlier" so the list stays short (Miller). */
export const DONE_FRESH_DAYS = 7;

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const lastChange = (n: Note) => n.movedAt ?? n.createdAt;
/** Inside a quadrant: the running task, then Doing, Blocked, To do. */
const STATUS_ORDER: Record<Tag, number> = { doing: 0, blocker: 1, todo: 2, done: 3 };

const byNewest = (a: Note, b: Note) => lastChange(b).localeCompare(lastChange(a));
const sum = (notes: Note[], f: (n: Note) => number) => notes.reduce((total, n) => total + f(n), 0);

/** Open tasks per quadrant, in grid order, with their points and tracked time. */
export function matrix(notes: Note[], nowMs: number): QuadrantView[] {
  const open = notes
    .filter((n) => n.tag !== 'done')
    .sort((a, b) => Number(Boolean(b.startedAt)) - Number(Boolean(a.startedAt)) || STATUS_ORDER[a.tag] - STATUS_ORDER[b.tag] || byNewest(a, b));
  return QUADRANTS.map((quadrant) => {
    const tasks = open.filter((n) => quadrantOf(n) === quadrant);
    return { quadrant, tasks, points: sum(tasks, sizeOf), trackedMs: sum(tasks, (n) => elapsedMs(n, nowMs)) };
  });
}

export function stats(notes: Note[], nowMs: number): Stats {
  const open = notes.filter((n) => n.tag !== 'done');
  return { open: open.length, points: sum(open, sizeOf), trackedMs: sum(open, (n) => elapsedMs(n, nowMs)) };
}

/** Done tasks, newest first; older than a week go to `earlier`. */
export function doneList(notes: Note[], today: string): { recent: Note[]; earlier: Note[] } {
  const done = notes.filter((n) => n.tag === 'done').sort(byNewest);
  const cutoff = toUtc(today) - DONE_FRESH_DAYS * DAY_MS;
  return { recent: done.filter((n) => toUtc(n.day) >= cutoff), earlier: done.filter((n) => toUtc(n.day) < cutoff) };
}

/** "Today", "Yesterday" or "28 Oct" for a task's last change. */
export function shortDay(day: string, today: string): string {
  const diff = Math.round((toUtc(today) - toUtc(day)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(toUtc(day));
}
