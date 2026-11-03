import type { Note } from './notes.ts';

/**
 * A task's clock in two readings, from its stopwatch runs (Start → Pause, Resume → Pause, …):
 *   actual = the time the clock ran (span minus the pauses)
 *   span   = first start to the end (the last pause or finish; now, while running)
 * Pure: type-only imports, so `api/` can reuse it.
 */
export type Timing = {
  /** ISO UTC of the first start; null for time logged before runs were dated. */
  start: string | null;
  /** ISO UTC of the end; null while unknown (see `start`). */
  end: string | null;
  /** Gaps between runs. */
  pauses: number;
  pausedMs: number;
  actualMs: number;
  spanMs: number;
};

/** Null for a task that never ran. */
export function taskTiming(note: Note, nowMs: number): Timing | null {
  const runs = (note.runs ?? [])
    .map((r) => ({ s: Date.parse(r.s), e: Date.parse(r.e) }))
    .filter((r) => Number.isFinite(r.s) && Number.isFinite(r.e) && r.e >= r.s);
  if (note.startedAt) {
    const s = Date.parse(note.startedAt);
    if (Number.isFinite(s)) runs.push({ s, e: Math.max(s, nowMs) });
  }
  runs.sort((a, b) => a.s - b.s);

  // Same as `elapsedMs` in notes.ts (kept local so this module stays import-free): banked time,
  // which includes runs from before they were dated, plus the run going on now.
  const runningMs = note.startedAt ? Math.max(0, nowMs - Date.parse(note.startedAt)) : 0;
  const actualMs = (note.spentMs ?? 0) + runningMs;

  const first = runs[0];
  const last = runs.at(-1);
  if (!first || !last) return actualMs > 0 ? { start: null, end: null, pauses: 0, pausedMs: 0, actualMs, spanMs: actualMs } : null;

  const spanMs = Math.max(last.e - first.s, actualMs);
  const pauses = runs.slice(1).filter((r, i) => r.s > (runs[i]?.e ?? r.s)).length;
  return {
    start: new Date(first.s).toISOString(),
    end: new Date(last.e).toISOString(),
    pauses,
    pausedMs: Math.max(0, spanMs - actualMs),
    actualMs,
    spanMs,
  };
}
