/** Pomodoro session rules. Pure: time is injected as `nowMs`. */

export const MODES = ['focus', 'short', 'long'] as const;
export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = { focus: 'Focus', short: 'Short Break', long: 'Long Break' };
export const MODE_MINUTES: Record<Mode, number> = { focus: 25, short: 5, long: 15 };
/** A long break after every this many focus rounds. */
export const LONG_EVERY = 4;

/**
 * The timer. Running: `endsAt` set (wall clock, so it survives reloads and sleeping tabs).
 * Paused or reset: `endsAt` null and `remainingMs` holds what is left.
 */
export type Session = { mode: Mode; taskId: string | null; endsAt: string | null; remainingMs: number; rounds: number };

export const fullMs = (mode: Mode) => MODE_MINUTES[mode] * 60_000;

export function newSession(mode: Mode = 'focus', taskId: string | null = null, rounds = 0): Session {
  return { mode, taskId, endsAt: null, remainingMs: fullMs(mode), rounds };
}

export function remainingMs(s: Session, nowMs: number): number {
  return s.endsAt ? Math.max(0, Date.parse(s.endsAt) - nowMs) : s.remainingMs;
}

export const isRunning = (s: Session) => s.endsAt !== null;
export const isFinished = (s: Session, nowMs: number) => isRunning(s) && remainingMs(s, nowMs) === 0;

/** 0 at the start of a round, 1 at its end. */
export function progress(s: Session, nowMs: number): number {
  return 1 - remainingMs(s, nowMs) / fullMs(s.mode);
}

export function start(s: Session, nowMs: number): Session {
  return { ...s, endsAt: new Date(nowMs + remainingMs(s, nowMs)).toISOString() };
}

export function pause(s: Session, nowMs: number): Session {
  return { ...s, endsAt: null, remainingMs: remainingMs(s, nowMs) };
}

export function reset(s: Session): Session {
  return { ...s, endsAt: null, remainingMs: fullMs(s.mode) };
}

/** Switching mode by hand starts that mode from full, stopped. */
export function switchMode(s: Session, mode: Mode): Session {
  return { ...s, mode, endsAt: null, remainingMs: fullMs(mode) };
}

/**
 * A round ran out. Focus → a break (long every LONG_EVERY rounds) and `credit` the focus task;
 * a break → focus. The next round waits for Start.
 */
export function complete(s: Session): { next: Session; credit: boolean } {
  if (s.mode !== 'focus') return { next: newSession('focus', s.taskId, s.rounds), credit: false };
  const rounds = s.rounds + 1;
  return { next: newSession(rounds % LONG_EVERY === 0 ? 'long' : 'short', s.taskId, rounds), credit: true };
}

/** "25:00", "4:59". */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Runtime guard for the session read back from local storage. */
export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    MODES.includes(v.mode as Mode) &&
    (v.taskId === null || typeof v.taskId === 'string') &&
    (v.endsAt === null || typeof v.endsAt === 'string') &&
    typeof v.remainingMs === 'number' &&
    v.remainingMs >= 0 &&
    Number.isInteger(v.rounds) &&
    (v.rounds as number) >= 0
  );
}
