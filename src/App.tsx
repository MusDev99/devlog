import { useEffect, useState } from 'preact/hooks';
import { Composer } from './components/Composer.tsx';
import { NoteList } from './components/NoteList.tsx';
import { deleteNote, notesForDay, saveNote } from './lib/db.ts';
import type { Draft, Note } from './lib/notes.ts';
import { useOnline } from './lib/pwa.ts';
import { dayKey, dayLabel, greeting } from './lib/today.ts';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

type Load = { state: 'loading' } | { state: 'ready'; notes: Note[] } | { state: 'error' };

export function App() {
  const online = useOnline();
  const now = new Date();
  const today = dayKey(now, timeZone);
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [undo, setUndo] = useState<Note | null>(null);

  useEffect(() => {
    notesForDay(today)
      .then((notes) => setLoad({ state: 'ready', notes }))
      .catch((error: unknown) => {
        console.error('Loading notes failed', error);
        setLoad({ state: 'error' });
      });
  }, [today]);

  const notes = load.state === 'ready' ? load.notes : [];
  const update = (fn: (current: Note[]) => Note[]) =>
    setLoad((prev) => ({ state: 'ready', notes: fn(prev.state === 'ready' ? prev.notes : []) }));

  async function add(draft: Draft) {
    const at = new Date();
    const note: Note = { id: crypto.randomUUID(), ...draft, createdAt: at.toISOString(), day: dayKey(at, timeZone) };
    await saveNote(note);
    update((current) => [...current, note]);
  }

  async function remove(note: Note) {
    await deleteNote(note.id);
    update((current) => current.filter((n) => n.id !== note.id));
    setUndo(note);
  }

  async function restore() {
    if (!undo) return;
    const note = undo;
    await saveNote(note);
    update((current) => [...current, note]);
    setUndo(null);
  }

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);

  return (
    <div class="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-[max(16px,env(safe-area-inset-top))]">
      <header class="flex items-start justify-between gap-4 py-4">
        <div>
          <p class="text-sm text-muted">{dayLabel(now, timeZone)}</p>
          <h1 class="text-2xl font-bold tracking-tight">{greeting(now, timeZone)}</h1>
        </div>
        {/* Never colour alone: the status pill always carries text. */}
        <span
          role="status"
          class={`mt-1 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs ${online ? 'text-ok' : 'text-warn'}`}
        >
          <span aria-hidden="true" class={`size-2 rounded-full ${online ? 'bg-ok' : 'bg-warn'}`} />
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      <main class="flex flex-1 flex-col pb-4">
        <section aria-labelledby="today-title" class="rounded-2xl border border-line bg-surface p-5">
          <h2 id="today-title" class="text-lg font-semibold">
            Today <span class="text-sm font-normal text-muted">· {notes.length} notes</span>
          </h2>
          {load.state === 'loading' && <div class="mt-3 h-16 animate-pulse rounded-xl bg-line/40" aria-label="Loading notes" />}
          {load.state === 'error' && (
            <p role="alert" class="mt-2 text-accent">
              Could not open this device's storage. Private mode can block it; try a normal window.
            </p>
          )}
          {load.state === 'ready' && notes.length === 0 && (
            <p class="mt-2 text-muted">
              No notes yet. Type or dictate below, or start with <b class="text-fg">b:</b> for a blocker. Saved on this
              phone, even offline.
            </p>
          )}
          {notes.length > 0 && <NoteList notes={notes} onDelete={remove} />}
        </section>

        <section aria-labelledby="standup-title" class="mt-4 rounded-2xl border border-dashed border-line p-5">
          <h2 id="standup-title" class="text-lg font-semibold">Standup</h2>
          <p class="mt-2 text-muted">Your AI standup (yesterday, today, blockers) arrives in the next update.</p>
        </section>

        <p class="pt-6 text-center text-xs text-muted">DevLog v{__APP_VERSION__} · notes stay on this device</p>
      </main>

      <div aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-28 flex justify-center px-4">
        {undo && (
          <div class="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-sm shadow-lg">
            Note deleted
            <button type="button" onClick={restore} class="min-h-11 font-semibold text-accent">
              Undo
            </button>
          </div>
        )}
      </div>

      <Composer onAdd={add} />
    </div>
  );
}
