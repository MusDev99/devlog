import { isNote, type Note } from './notes.ts';

/** IndexedDB access. Notes never leave the device; this is the only module that touches storage. */
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

export async function notesForDay(day: string): Promise<Note[]> {
  const rows: unknown[] = await done((await store('readonly')).index('day').getAll(day));
  return rows.filter(isNote);
}

export async function saveNote(note: Note): Promise<void> {
  await done((await store('readwrite')).put(note));
}

export async function deleteNote(id: string): Promise<void> {
  await done((await store('readwrite')).delete(id));
}

/** Notes of the most recent day before `day` that has any (the "yesterday" of a standup, weekends skipped). */
export async function previousWorkday(day: string): Promise<Note[]> {
  const index = (await store('readonly')).index('day');
  const cursor = await done(index.openCursor(IDBKeyRange.upperBound(day, true), 'prev'));
  if (!cursor) return [];
  return notesForDay(String(cursor.key));
}
