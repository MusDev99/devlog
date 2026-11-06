import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { createTicker } from './clock.ts';

const ticker = createTicker();

/**
 * The current time in ms, re-read every second while `active` (a stopwatch runs). When not active the
 * component does not subscribe, so it is never re-rendered by the clock.
 */
export function useClock(active: boolean): number {
  const [, setTick] = useState(0);
  useEffect(() => (active ? ticker.subscribe(() => setTick((n) => n + 1)) : undefined), [active]);
  return Date.now();
}

/** A function whose identity never changes but always calls the latest `fn`: keeps memoised children from re-rendering. */
export function useStable<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}

/** True while the media query matches (e.g. the wide, side-by-side layout). */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}
