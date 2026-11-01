import { useEffect, useState } from 'preact/hooks';
import { Board } from './components/Board.tsx';
import { Composer } from './components/Composer.tsx';
import { Icon } from './components/Icon.tsx';
import { RecapCard } from './components/RecapCard.tsx';
import { StandupCard } from './components/StandupCard.tsx';
import { boardColumns } from './lib/board.ts';
import { allNotes, deleteNote, saveNote } from './lib/db.ts';
import { moveNote, TAG_LABELS, type Draft, type Note, type Tag } from './lib/notes.ts';
import { useOnline } from './lib/pwa.ts';
import { dayKey, dayLabel, greeting } from './lib/today.ts';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

type Load = { state: 'loading' } | { state: 'ready'; cards: Note[] } | { state: 'error' };

/** The last move or delete, with the card as it was before, so Undo can put it back. */
type Undo = { message: string; before: Note };

export function App() {
  const online = useOnline();
  const now = new Date();
  const today = dayKey(now, timeZone);
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [active, setActive] = useState<Tag>('doing');
  const [undo, setUndo] = useState<Undo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    allNotes()
      .then((cards) => setLoad({ state: 'ready', cards }))
      .catch((error: unknown) => {
        console.error('Loading cards failed', error);
        setLoad({ state: 'error' });
      });
  }, []);

  const cards = load.state === 'ready' ? load.cards : [];
  const update = (fn: (current: Note[]) => Note[]) =>
    setLoad((prev) => ({ state: 'ready', cards: fn(prev.state === 'ready' ? prev.cards : []) }));
  const put = (note: Note) => update((current) => [...current.filter((n) => n.id !== note.id), note]);

  async function add(draft: Draft) {
    const at = new Date();
    const note: Note = { id: crypto.randomUUID(), ...draft, createdAt: at.toISOString(), day: dayKey(at, timeZone) };
    await saveNote(note);
    put(note);
    // A prefix can send the card elsewhere: follow it so it never seems to vanish.
    setActive(draft.tag);
  }

  async function move(note: Note, tag: Tag) {
    const at = new Date();
    const moved = moveNote(note, tag, at, dayKey(at, timeZone));
    try {
      await saveNote(moved);
      put(moved);
      setUndo({ message: `Moved to ${TAG_LABELS[tag]}`, before: note });
    } catch {
      setToast('Could not save on this device');
    }
  }

  async function remove(note: Note) {
    try {
      await deleteNote(note.id);
      update((current) => current.filter((n) => n.id !== note.id));
      setUndo({ message: 'Card deleted', before: note });
    } catch {
      setToast('Could not save on this device');
    }
  }

  async function restore() {
    if (!undo) return;
    const { before } = undo;
    await saveNote(before);
    put(before);
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
    <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[max(8px,env(safe-area-inset-top))]">
      {/* Material top app bar: supporting date above a large greeting. */}
      <header class="flex items-start justify-between gap-4 pt-4 pb-5">
        <div class="min-w-0">
          <p class="text-sm font-medium tracking-wide text-muted">{dayLabel(now, timeZone)}</p>
          <h1 class="mt-1 text-[1.75rem] leading-9 font-normal">{greeting(now, timeZone)}</h1>
        </div>
        {/* Only worth a word when it changes something: the board keeps working either way. */}
        {!online && (
          <span role="status" class="mt-1 inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-warn">
            <Icon name="offline" class="size-[18px]" />
            Offline
          </span>
        )}
      </header>

      <main class="flex flex-1 flex-col gap-4 pb-4">
        {load.state === 'loading' && <div class="h-40 animate-pulse rounded-3xl bg-surface" aria-label="Loading board" />}
        {load.state === 'error' && (
          <p role="alert" class="rounded-3xl bg-surface p-5 text-error">
            Could not open this device's storage. Private mode can block it; try a normal window.
          </p>
        )}
        {load.state === 'ready' && (
          <Board
            columns={boardColumns(cards, today)}
            today={today}
            active={active}
            onSelect={setActive}
            onMove={move}
            onDelete={remove}
          />
        )}

        <div class="grid gap-4 md:grid-cols-2 md:items-start">
          <StandupCard today={today} cards={cards} onToast={setToast} />
          <RecapCard today={today} cards={cards} onToast={setToast} />
        </div>

        <p class="pt-2 text-center text-xs text-muted">DevLog v{__APP_VERSION__} · cards stored on this device, nothing sent anywhere</p>
      </main>

      {/* Material snackbar: inverse surface, one text action. */}
      <div aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
        {toast && !undo && (
          <div class="pointer-events-auto min-h-12 rounded-lg bg-inverse px-4 py-3.5 text-sm text-on-inverse shadow-lg">{toast}</div>
        )}
        {undo && (
          <div class="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-lg bg-inverse py-1 pr-2 pl-4 text-sm text-on-inverse shadow-lg">
            {undo.message}
            <button type="button" onClick={restore} class="state-layer min-h-11 rounded-full px-3 font-medium text-inverse-primary">
              Undo
            </button>
          </div>
        )}
      </div>

      <Composer target={active} onAdd={add} />
    </div>
  );
}
