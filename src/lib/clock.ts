/**
 * One shared one-second ticker. Pure and import-free: the timer functions are injected so tests never wait.
 * Only components that show a running time subscribe, so a tick re-renders them and nothing else.
 */
export type Schedule = (fn: () => void, ms: number) => unknown;
export type Cancel = (handle: unknown) => void;

export function createTicker(everyMs = 1000, schedule: Schedule = (fn, ms) => setInterval(fn, ms), cancel: Cancel = (h) => clearInterval(h as ReturnType<typeof setInterval>)) {
  const listeners = new Set<() => void>();
  let handle: unknown;
  let started = false;

  /** Start ticking for `listener`; the returned function stops it. The interval runs only while someone listens. */
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (!started) {
      started = true;
      handle = schedule(() => listeners.forEach((l) => l()), everyMs);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && started) {
        started = false;
        cancel(handle);
      }
    };
  }

  return { subscribe, size: () => listeners.size };
}
