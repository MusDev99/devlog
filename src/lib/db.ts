import { isNote, type Note } from './notes.ts';
import { isSession, type Session } from './pomodoro.ts';

/** IndexedDB access. Cards never leave the device; this is the only module that touches storage. */
const DB_NAME = 'devlog';
const STORE = 'notes';

let dbPromise: Promise<IDBDatabase> | null = null;

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

const SESSION_KEY = 'devlog.session';

/** The Pomodoro session, so a running timer survives a reload. Null when absent, unreadable or blocked. */
export function loadSession(): Session | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return isSession(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Private mode or full storage: the timer still works until the page closes.
  }
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
