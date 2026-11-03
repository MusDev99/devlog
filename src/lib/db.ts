import { isNote, type Note } from './notes.ts';
import { DEFAULT_TARGETS, isTargets, type Targets } from './stats.ts';

/**
 * IndexedDB and localStorage access: the only module that touches storage on the device.
 * Each signed-in person gets their own database (`devlog:<email>`), so two accounts on one phone never mix.
 */
const LEGACY_DB = 'devlog';
const STORE = 'notes';
const ADOPTED_KEY = 'devlog.legacy-adopted';

let dbName = LEGACY_DB;
let dbPromise: Promise<IDBDatabase> | null = null;

/** Point storage at this person's database (null = the shared, pre-sign-in one). Call before reading tasks. */
export function setAccount(email: string | null): void {
  const next = email ? `devlog:${email.toLowerCase()}` : LEGACY_DB;
  if (next === dbName) return;
  dbPromise?.then((db) => db.close()).catch(() => undefined);
  dbName = next;
  dbPromise = null;
}

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

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('day', 'day');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open local storage'));
  });
}

function open(): Promise<IDBDatabase> {
  dbPromise ??= openDb(dbName).catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

/**
 * Tasks made on this device before sign-in existed belong to whoever signs in first: copy them into
 * that person's database, once. The old database is left as it was (nothing is deleted).
 */
export async function adoptLegacyTasks(): Promise<number> {
  if (dbName === LEGACY_DB || loadPref(ADOPTED_KEY)) return 0;
  savePref(ADOPTED_KEY, dbName);
  const legacy = await openDb(LEGACY_DB);
  const rows: unknown[] = await done(legacy.transaction(STORE, 'readonly').objectStore(STORE).getAll());
  legacy.close();
  const notes = rows.filter(isNote);
  if (notes.length === 0) return 0;
  const tx = (await open()).transaction(STORE, 'readwrite');
  for (const note of notes) tx.objectStore(STORE).put(note);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not copy tasks'));
  });
  return notes.length;
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

const USER_KEY = 'devlog.user';
export type User = { email: string; name: string };

/** The last signed-in person, so an offline launch can open without asking the server. */
export function loadUser(): User | null {
  try {
    const value = JSON.parse(loadPref(USER_KEY) ?? 'null') as Partial<User> | null;
    return value && typeof value.email === 'string' && value.email.includes('@') ? { email: value.email, name: typeof value.name === 'string' ? value.name : '' } : null;
  } catch {
    return null;
  }
}

export function saveUser(user: User | null): void {
  savePref(USER_KEY, user ? JSON.stringify(user) : '');
}
