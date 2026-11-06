import type { Note } from './notes.ts';

/** Pure list changes for optimistic saves: show a change now, take it back if the device write fails. */

/** `changed` replace the notes with the same id (or are added); order of the others is kept. */
export function applyChange(current: readonly Note[], changed: readonly Note[]): Note[] {
  return [...current.filter((n) => !changed.some((c) => c.id === n.id)), ...changed];
}

/** What each changed id looked like before (absent for a brand-new task). Take it before applying the change. */
export function snapshot(current: readonly Note[], changed: readonly Note[]): Map<string, Note> {
  return new Map(current.filter((n) => changed.some((c) => c.id === n.id)).map((n) => [n.id, n]));
}

/**
 * Take a failed change back. Only notes that are still the very objects this attempt put in are restored
 * (to their snapshot, or removed when they were new); a note edited again since stays as it is.
 */
export function revertChange(current: readonly Note[], changed: readonly Note[], before: ReadonlyMap<string, Note>): Note[] {
  return current.flatMap((n) => {
    if (!changed.includes(n)) return [n];
    const old = before.get(n.id);
    return old ? [old] : [];
  });
}
