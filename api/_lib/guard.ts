import { createHash, timingSafeEqual } from 'node:crypto';

/** Server-only helpers for the AI function. No relative imports (Vercel bundles this file as is). */

/** Constant-time passcode check; hashing first makes the compared buffers equal length. */
export function passcodeMatches(given: string | null, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/** Fixed-window limiter per client key. Per instance only: a cost brake, not a security boundary. */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; start: number }>();
  return (key: string, now: number): boolean => {
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { count: 1, start: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
