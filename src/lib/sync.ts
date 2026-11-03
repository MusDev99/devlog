import type { Note } from './notes.ts';

/** Sync rules for the Tasks sheet. Pure: what to send, in batches the server accepts. */

/** Per task: the version last confirmed by the sheet, and a pending delete. */
export type SyncState = { id: string; syncedAt?: string; deletedAt?: string };
export type Work = { upserts: Note[]; deletes: { id: string; at: string }[] };

/** A task's version: when it was last saved on this device (older tasks: when created). */
export const versionOf = (n: Note) => n.updatedAt ?? n.createdAt;

/** Tasks changed since the sheet last confirmed them, and deletes of tasks the sheet already has. */
export function pending(notes: Note[], states: SyncState[]): Work {
  const byId = new Map(states.map((s) => [s.id, s]));
  const live = new Set(notes.map((n) => n.id));
  return {
    upserts: notes.filter((n) => {
      const synced = byId.get(n.id)?.syncedAt;
      return !synced || versionOf(n) > synced;
    }),
    deletes: states.filter((s) => s.deletedAt && !live.has(s.id)).map((s) => ({ id: s.id, at: s.deletedAt ?? '' })),
  };
}

export const count = (w: Work) => w.upserts.length + w.deletes.length;

/** Split work into requests the server accepts: at most `maxItems` items and about `maxBytes` of JSON each. */
export function batches(work: Work, maxItems = 40, maxBytes = 48_000): Work[] {
  const out: Work[] = [];
  let current: Work = { upserts: [], deletes: [] };
  let size = 0;
  const push = (add: (w: Work) => void, bytes: number) => {
    if (count(current) > 0 && (count(current) >= maxItems || size + bytes > maxBytes)) {
      out.push(current);
      current = { upserts: [], deletes: [] };
      size = 0;
    }
    add(current);
    size += bytes;
  };
  for (const n of work.upserts) push((w) => w.upserts.push(n), JSON.stringify(n).length);
  for (const d of work.deletes) push((w) => w.deletes.push(d), JSON.stringify(d).length);
  if (count(current) > 0) out.push(current);
  return out;
}

/** Wait before retrying after `failures` failed attempts: 15s, 30s, 1m … capped at 5 minutes. */
export const backoffMs = (failures: number) => Math.min(5 * 60_000, 15_000 * 2 ** Math.max(0, failures - 1));
