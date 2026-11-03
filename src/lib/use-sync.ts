import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { allNotes, allSyncStates, markSynced } from './db.ts';
import { backoffMs, batches, count, pending, versionOf } from './sync.ts';

export type SyncStatus = {
  state: 'off' | 'idle' | 'syncing' | 'synced' | 'waiting' | 'error' | 'signed-out' | 'unavailable';
  /** Changes not in the sheet yet. */
  waiting: number;
};

/**
 * Pushes changed tasks to the Google Sheet. Offline-first: the device is the source; the sheet catches up
 * about 2s after the last change, when the connection returns, and when the app comes back to the
 * foreground. Failures retry with backoff. `revision` changes whenever tasks change.
 */
export function useSync(enabled: boolean, revision: unknown): { status: SyncStatus; retry: () => void } {
  const [status, setStatus] = useState<SyncStatus>({ state: enabled ? 'idle' : 'off', waiting: 0 });
  const running = useRef(false);
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const run = useCallback(async () => {
    if (!enabled || running.current) return;
    running.current = true;
    clearTimeout(retryTimer.current);
    let left = 0;
    try {
      const work = pending(await allNotes(), await allSyncStates());
      left = count(work);
      if (left === 0) return setStatus({ state: 'synced', waiting: 0 });
      if (!navigator.onLine) return setStatus({ state: 'waiting', waiting: left });
      setStatus({ state: 'syncing', waiting: left });
      for (const batch of batches(work)) {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(batch),
        });
        if (res.status === 401) return setStatus({ state: 'signed-out', waiting: left });
        if (res.status === 503) return setStatus({ state: 'unavailable', waiting: left });
        if (!res.ok) throw new Error(`tasks ${res.status}`);
        await markSynced(
          batch.upserts.map((n) => ({ id: n.id, version: versionOf(n) })),
          batch.deletes.map((d) => d.id),
        );
        left -= count(batch);
      }
      failures.current = 0;
      setStatus({ state: 'synced', waiting: 0 });
    } catch {
      failures.current += 1;
      setStatus({ state: 'error', waiting: left });
      retryTimer.current = setTimeout(() => void run(), backoffMs(failures.current));
    } finally {
      running.current = false;
    }
  }, [enabled]);

  // Debounce: a burst of edits becomes one push.
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => void run(), 2000);
    return () => clearTimeout(timer);
  }, [enabled, revision, run]);

  useEffect(() => {
    if (!enabled) return;
    const kick = () => void run();
    const visible = () => document.visibilityState === 'visible' && kick();
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', visible);
      clearTimeout(retryTimer.current);
    };
  }, [enabled, run]);

  return { status, retry: () => void run() };
}
