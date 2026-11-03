/** Fixed-window limiter per key. Per serverless instance only: a cost brake, not a security boundary. */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; start: number }>();
  return (key: string, now: number): boolean => {
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      if (hits.size > 1000) hits.clear();
      hits.set(key, { count: 1, start: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
