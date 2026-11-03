import { placeOf, PLACES, sizeOf, type Note, type Place } from './notes.ts';
import type { Targets } from './targets.ts';
import { dayKey } from './today.ts';

export { DEFAULT_TARGETS, isTargets, TARGET_LIMITS, type Targets } from './targets.ts';

/** Daily activity stats, streaks, weekly review, time breakdown and insights. Pure: `today`, `nowMs` and the zone are injected. */

/** One day: stopwatch time and runs (by the day each run started), finished tasks and their points (by the day they were done). */
export type DayStat = { day: string; focusMs: number; runs: number; done: number; points: number };

export type DatedRun = { note: Note; start: number; ms: number };

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const shiftDay = (day: string, by: number) => new Date(toUtc(day) + by * DAY_MS).toISOString().slice(0, 10);
const empty = (day: string): DayStat => ({ day, focusMs: 0, runs: 0, done: 0, points: 0 });

/** Every dated run, the one still running included (up to `nowMs`). */
export function datedRuns(notes: Note[], nowMs: number): DatedRun[] {
  return notes.flatMap((note) => {
    const runs = (note.runs ?? []).map((r) => ({ note, start: Date.parse(r.s), ms: Math.max(0, Date.parse(r.e) - Date.parse(r.s)) }));
    if (note.startedAt) runs.push({ note, start: Date.parse(note.startedAt), ms: Math.max(0, nowMs - Date.parse(note.startedAt)) });
    return runs.filter((r) => Number.isFinite(r.start));
  });
}

export function dayStats(notes: Note[], nowMs: number, timeZone: string): Map<string, DayStat> {
  const days = new Map<string, DayStat>();
  const at = (day: string) => {
    let d = days.get(day);
    if (!d) days.set(day, (d = empty(day)));
    return d;
  };
  for (const r of datedRuns(notes, nowMs)) {
    const d = at(dayKey(new Date(r.start), timeZone));
    d.focusMs += r.ms;
    d.runs += 1;
  }
  for (const n of notes.filter((n) => n.tag === 'done')) {
    const d = at(n.day);
    d.done += 1;
    d.points += sizeOf(n);
  }
  return days;
}

/** The `count` days ending `today`, oldest first, with empty days filled in. */
export function series(days: Map<string, DayStat>, today: string, count = 7): DayStat[] {
  return Array.from({ length: count }, (_, i) => {
    const day = shiftDay(today, i - count + 1);
    return days.get(day) ?? empty(day);
  });
}

export const isActive = (d: DayStat) => d.focusMs > 0 || d.done > 0;
export const onTarget = (t: Targets) => (d: DayStat) => d.points >= t.points;

/** Days in a row meeting `hit`, ending today, or yesterday if today has not got there yet (so a streak is not lost before the day is over). */
export function streak(days: Map<string, DayStat>, today: string, hit: (d: DayStat) => boolean): number {
  const ok = (day: string) => hit(days.get(day) ?? empty(day));
  let day = ok(today) ? today : shiftDay(today, -1);
  let count = 0;
  while (ok(day)) {
    count += 1;
    day = shiftDay(day, -1);
  }
  return count;
}

/** The longest run of consecutive days meeting `hit`, across all history. */
export function longestStreak(days: Map<string, DayStat>, hit: (d: DayStat) => boolean): number {
  const hits = [...days.values()].filter(hit).map((d) => d.day).sort();
  let best = 0;
  let current = 0;
  hits.forEach((day, i) => {
    current = i > 0 && shiftDay(hits[i - 1] ?? '', 1) === day ? current + 1 : 1;
    best = Math.max(best, current);
  });
  return best;
}

export type Review = {
  totalMs: number;
  previousMs: number;
  runs: number;
  points: number;
  done: number;
  bestDay: DayStat | null;
};

/** The last 7 days against the 7 before. */
export function weeklyReview(days: Map<string, DayStat>, today: string): Review {
  const week = series(days, today, 7);
  const before = series(days, shiftDay(today, -7), 7);
  const sum = (list: DayStat[], f: (d: DayStat) => number) => list.reduce((t, d) => t + f(d), 0);
  const best = [...week].sort((a, b) => b.focusMs - a.focusMs)[0];
  return {
    totalMs: sum(week, (d) => d.focusMs),
    previousMs: sum(before, (d) => d.focusMs),
    runs: sum(week, (d) => d.runs),
    points: sum(week, (d) => d.points),
    done: sum(week, (d) => d.done),
    bestDay: best && best.focusMs > 0 ? best : null,
  };
}

export type TaskTime = { note: Note; ms: number; share: number; msPerPoint: number };
export type Breakdown = { totalMs: number; tasks: TaskTime[]; places: Record<Place, number> };

/** Where the time of the `count` days ending `today` went: per task (largest first) and per quadrant. */
export function breakdown(notes: Note[], nowMs: number, timeZone: string, today: string, count = 7): Breakdown {
  const from = shiftDay(today, -count + 1);
  const perTask = new Map<Note, number>();
  for (const r of datedRuns(notes, nowMs)) {
    const day = dayKey(new Date(r.start), timeZone);
    if (day >= from && day <= today) perTask.set(r.note, (perTask.get(r.note) ?? 0) + r.ms);
  }
  const totalMs = [...perTask.values()].reduce((a, b) => a + b, 0);
  const places = Object.fromEntries(PLACES.map((p) => [p, 0])) as Record<Place, number>;
  const tasks = [...perTask.entries()]
    .filter(([, ms]) => ms > 0)
    .map(([note, ms]) => {
      places[placeOf(note)] += ms;
      return { note, ms, share: totalMs ? ms / totalMs : 0, msPerPoint: ms / sizeOf(note) };
    })
    .sort((a, b) => b.ms - a.ms);
  return { totalMs, tasks, places };
}

export type Insight = { tone: 'good' | 'warn' | 'info'; text: string };

const pct = (x: number) => `${Math.round(x * 100)}%`;
/** "1h 05m" / "25m". */
export const formatMinutes = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
};

/**
 * Plain-language readings of the numbers: where time went on the urgent × important grid,
 * sizing accuracy, trend, peak hour and blockers. At most five, most useful first.
 */
export function insights(notes: Note[], nowMs: number, timeZone: string, today: string, targets: Targets): Insight[] {
  const days = dayStats(notes, nowMs, timeZone);
  const b = breakdown(notes, nowMs, timeZone, today);
  const review = weeklyReview(days, today);
  const out: Insight[] = [];

  if (b.totalMs >= 30 * 60_000) {
    const share = (p: Place) => b.places[p] / b.totalMs;
    const [top] = [...PLACES].sort((x, y) => b.places[y] - b.places[x]);
    if (share('do') > 0.5) out.push({ tone: 'warn', text: `${pct(share('do'))} of your time went to Do now: mostly firefighting. Plan Schedule work before it turns urgent.` });
    else if (top === 'schedule') out.push({ tone: 'good', text: `Most of your time (${pct(share('schedule'))}) went to Schedule: important work before it got urgent.` });
    const low = share('delegate') + share('eliminate');
    if (low >= 0.3) out.push({ tone: 'warn', text: `${pct(low)} of your time went to low-importance work (Delegate, Drop). Hand off or drop some of it.` });
    if (share('unsorted') >= 0.25) out.push({ tone: 'info', text: `${pct(share('unsorted'))} of your time was on unsorted tasks. Sorting them shows what matters.` });
  }

  // Sizing: done tasks that took far longer per story point than the usual pace.
  const sized = b.tasks.filter((t) => t.note.tag === 'done' && t.ms >= 15 * 60_000);
  if (sized.length >= 2) {
    const pace = sized.reduce((sum, t) => sum + t.msPerPoint, 0) / sized.length;
    const slow = sized.find((t) => t.msPerPoint > pace * 2 && t.ms >= 30 * 60_000);
    if (slow) out.push({ tone: 'warn', text: `"${slow.note.text}" took ${formatMinutes(slow.ms)} for ${sizeOf(slow.note)} SP, over twice your usual ${formatMinutes(pace)} per point. Size similar work bigger.` });
    else out.push({ tone: 'good', text: `Your sizing is steady: about ${formatMinutes(pace)} per story point.` });
  }

  if (review.previousMs >= 30 * 60_000) {
    const change = (review.totalMs - review.previousMs) / review.previousMs;
    if (change >= 0.2) out.push({ tone: 'good', text: `${pct(change)} more focus time than the week before.` });
    else if (change <= -0.2) out.push({ tone: 'warn', text: `${pct(-change)} less focus time than the week before.` });
  }

  const week = series(days, today, 7);
  const hits = week.filter(onTarget(targets)).length;
  if (week.some(isActive)) out.push({ tone: hits >= 4 ? 'good' : 'info', text: `${hits} of the last 7 days reached your ${targets.points} SP target.` });

  // Peak hour: the hour of day whose runs add up to the most time.
  const byHour = new Map<number, number>();
  const hourOf = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone });
  for (const r of datedRuns(notes, nowMs)) {
    const h = Number(hourOf.format(new Date(r.start)));
    byHour.set(h, (byHour.get(h) ?? 0) + r.ms);
  }
  const [peak] = [...byHour.entries()].sort((x, y) => y[1] - x[1]);
  if (peak && b.totalMs >= 60 * 60_000) out.push({ tone: 'info', text: `You focus most around ${String(peak[0]).padStart(2, '0')}:00. Put hard tasks there.` });

  const blocked = notes.filter((n) => n.tag === 'blocker').length;
  if (blocked > 0) out.push({ tone: 'warn', text: `${blocked} ${blocked === 1 ? 'task is' : 'tasks are'} blocked. Unblocking one may free more than starting new work.` });

  return out.slice(0, 5);
}

/** "Tue" for a day key. */
export function weekday(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(toUtc(day));
}

