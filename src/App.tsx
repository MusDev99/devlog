import { useEffect, useState } from 'preact/hooks';
import { Composer } from './components/Composer.tsx';
import { Icon } from './components/Icon.tsx';
import { NoteList } from './components/NoteList.tsx';
import { StandupCard } from './components/StandupCard.tsx';
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
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div class="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-[max(8px,env(safe-area-inset-top))]">
      {/* Material top app bar: supporting date above a large greeting. */}
      <header class="flex items-start justify-between gap-4 pt-4 pb-6">
        <div class="min-w-0">
          <p class="text-sm font-medium tracking-wide text-muted">{dayLabel(now, timeZone)}</p>
          <h1 class="mt-1 text-[1.75rem] leading-9 font-normal">{greeting(now, timeZone)}</h1>
        </div>
        {/* Never colour alone: the status chip always carries an icon and text. */}
        <span
          role="status"
          class={`mt-1 inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium ${online ? 'text-ok' : 'text-warn'}`}
        >
          <Icon name={online ? 'online' : 'offline'} class="size-[18px]" />
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      <main class="flex flex-1 flex-col gap-4 pb-4">
        <section aria-labelledby="today-title" class="rounded-3xl bg-surface p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 id="today-title" class="text-[1.375rem] leading-7">
              Today
            </h2>
            <span class="rounded-full bg-primary-container px-3 py-1 text-xs font-medium text-on-primary-container">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
          {load.state === 'loading' && <div class="mt-4 h-16 animate-pulse rounded-2xl bg-surface-highest" aria-label="Loading notes" />}
          {load.state === 'error' && (
            <p role="alert" class="mt-3 text-error">
              Could not open this device's storage. Private mode can block it; try a normal window.
            </p>
          )}
          {load.state === 'ready' && notes.length === 0 && (
            <p class="mt-3 leading-6 text-muted">
              No notes yet. Type or dictate below, or start with <b class="font-medium text-fg">b:</b> for a blocker. Saved
              on this phone, even offline.
            </p>
          )}
          {notes.length > 0 && <NoteList notes={notes} onDelete={remove} />}
        </section>

        <StandupCard today={today} notes={notes} online={online} onToast={setToast} />

        <p class="pt-2 text-center text-xs text-muted">DevLog v{__APP_VERSION__} · notes stored on this device</p>
      </main>

      {/* Material snackbar: inverse surface, one text action. */}
      <div aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-36 flex justify-center px-4">
        {toast && !undo && (
          <div class="pointer-events-auto min-h-12 rounded-lg bg-inverse px-4 py-3.5 text-sm text-on-inverse shadow-lg">{toast}</div>
        )}
        {undo && (
          <div class="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-lg bg-inverse py-1 pr-2 pl-4 text-sm text-on-inverse shadow-lg">
            Note deleted
            <button type="button" onClick={restore} class="state-layer min-h-11 rounded-full px-3 font-medium text-inverse-primary">
              Undo
            </button>
          </div>
        )}
      </div>

      <Composer onAdd={add} />
    </div>
  );
}
