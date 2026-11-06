/**
 * Row swipe rules. Pure and import-free so the feel (when a gesture is a swipe, how far it follows the
 * finger, when it commits) is tested without a browser.
 * Right = finish (or reopen), left = more actions. A direction that does nothing resists instead of moving.
 */
export type Axis = 'x' | 'y';
export type Allow = { left: boolean; right: boolean };
export type Verdict = 'left' | 'right' | null;

/** Finger travel before the browser-or-us decision is made. */
export const LOCK_PX = 8;

/** Which way a touch is going: null until it has moved LOCK_PX. A mostly vertical move is a scroll and is never ours. */
export function lockAxis(dx: number, dy: number): Axis | null {
  if (Math.hypot(dx, dy) < LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
}

/** How far a swipe must travel to count: 30% of the row, between 72 and 160 px. */
export const threshold = (width: number): number => Math.max(72, Math.min(160, width * 0.3));

/** Where the row sits for a finger `dx` from where it landed: 1:1 to the threshold, 35% beyond it; a dead direction barely moves. */
export function pull(dx: number, width: number, allow: Allow): number {
  if (dx === 0) return 0;
  const dir = dx < 0 ? 'left' : 'right';
  const d = Math.abs(dx);
  if (!allow[dir]) return Math.sign(dx) * Math.min(24, d * 0.15);
  const t = threshold(width);
  const shown = d <= t ? d : t + (d - t) * 0.35;
  return Math.sign(dx) * Math.min(shown, width * 0.6);
}

/** True once the finger is past the point where letting go would act (drives the "armed" tick and highlight). */
export function armed(dx: number, width: number, allow: Allow): boolean {
  const dir = dx < 0 ? 'left' : 'right';
  return dx !== 0 && allow[dir] && Math.abs(dx) >= threshold(width);
}

/** On release: act when past the threshold, or on a quick flick (velocity in px/ms) of at least 40 px the same way. */
export function commitOf(dx: number, width: number, velocity: number, allow: Allow): Verdict {
  if (dx === 0) return null;
  const dir = dx < 0 ? 'left' : 'right';
  if (!allow[dir]) return null;
  const flick = Math.abs(velocity) > 0.6 && Math.sign(velocity) === Math.sign(dx) && Math.abs(dx) >= 40;
  return Math.abs(dx) >= threshold(width) || flick ? dir : null;
}
