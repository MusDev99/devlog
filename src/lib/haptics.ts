// Vibration feedback (Vibration API) for the stopwatch. Pure apart from one module-level on/off switch; the
// navigator is injected so tests never touch a real device. Silent where the API is missing (iPhone / iPad
// Safari, desktop browsers) and when the person turned it off.

export type Haptic = 'start' | 'stop' | 'finish' | 'grab';

/** Milliseconds. A number is one buzz; an array alternates buzz, pause, buzz, ... Each kind feels different: */
export const PATTERNS: Record<Haptic, number | number[]> = {
  start: 30, // one firm press: the clock is running
  stop: [20, 40, 20], // two light taps: it stopped (pause, switch away or status change)
  finish: [30, 50, 30, 50, 90], // rising triple: done
  grab: 10, // the faint tick when a long-press lifts a task for dragging
};

/** Per-device preference (localStorage via `loadPref` / `savePref`); on unless explicitly "off". */
export const HAPTICS_KEY = 'devlog.haptics';
export const parseHaptics = (stored: string | null): boolean => stored !== 'off';

type Vibrator = { vibrate?: (pattern: number | number[]) => boolean };
const browserNav = (): Vibrator | undefined => (typeof navigator === 'undefined' ? undefined : navigator);

let enabled = true;
export const setHaptics = (on: boolean): void => {
  enabled = on;
};

/** Whether this device can vibrate at all (decides if the setting is shown). */
export const canVibrate = (nav: Vibrator | undefined = browserNav()): boolean => typeof nav?.vibrate === 'function';

/**
 * Buzz for one event. Returns whether a pattern was sent. Never throws: browsers may refuse without a recent tap
 * (user activation), so call it straight from the handler, before any `await`.
 */
export function buzz(kind: Haptic, nav: Vibrator | undefined = browserNav()): boolean {
  if (!enabled || !nav || typeof nav.vibrate !== 'function') return false;
  try {
    return nav.vibrate(PATTERNS[kind]);
  } catch {
    return false;
  }
}
