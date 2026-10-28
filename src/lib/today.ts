/** Pure date helpers. Time is always injected so tests stay deterministic. */

export type Greeting = 'Good morning' | 'Good afternoon' | 'Good evening';

export function greeting(now: Date, timeZone: string): Greeting {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** `YYYY-MM-DD` in the given zone: the key notes are grouped by. */
export function dayKey(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(now);
}

/** e.g. "Wednesday 28 Oct" for the header. */
export function dayLabel(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone }).format(now);
}
