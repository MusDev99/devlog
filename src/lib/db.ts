import { isNote, type Note } from './notes.ts';
import { DEFAULT_TARGETS, isTargets, type Targets } from './stats.ts';

/** IndexedDB access. Cards never leave the device; this is the only module that touches storage. */
const DB_NAME = 'devlog';
const STORE = 'notes';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Ask the browser not to evict this device's tasks under storage pressure (they exist nowhere else).
 * Installed apps are usually granted at once; elsewhere the browser may say no, which changes nothing.
 */
export async function keepStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('day', 'day');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('Could not open local storage'));
    };
  });
  return dbPromise;
}

function done<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Local storage request failed'));
  });
}

async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return (await open()).transaction(STORE, mode).objectStore(STORE);
}

/** Every card on the board. Corrupt rows are skipped. */
export async function allNotes(): Promise<Note[]> {
  const rows: unknown[] = await done((await store('readonly')).getAll());
  return rows.filter(isNote);
}

export async function saveNote(note: Note): Promise<void> {
  await done((await store('readwrite')).put(note));
}

export async function deleteNote(id: string): Promise<void> {
  await done((await store('readwrite')).delete(id));
}

/** Small per-device preferences (e.g. List or Matrix). Absent or blocked storage reads as null. */
export function loadPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function savePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Convenience only.
  }
}

const TARGETS_KEY = 'devlog.targets';

/** Daily targets from Settings; defaults when absent or invalid. */
export function loadTargets(): Targets {
  try {
    const value: unknown = JSON.parse(loadPref(TARGETS_KEY) ?? 'null');
    return isTargets(value) ? value : DEFAULT_TARGETS;
  } catch {
    return DEFAULT_TARGETS;
  }
}

export function saveTargets(targets: Targets): void {
  savePref(TARGETS_KEY, JSON.stringify(targets));
}
