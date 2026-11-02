import { useEffect, useState } from 'preact/hooks';
import { Composer } from './components/Composer.tsx';
import { Icon } from './components/Icon.tsx';
import { Matrix, type DropTarget } from './components/Matrix.tsx';
import { Overview } from './components/Overview.tsx';
import { RecapCard } from './components/RecapCard.tsx';
import { StandupCard } from './components/StandupCard.tsx';
import { allNotes, deleteNote, saveNote } from './lib/db.ts';
import { doneList, matrix, stats } from './lib/matrix.ts';
import {
  moveNote,
  nextSize,
  QUADRANT_LABELS,
  sizeOf,
  startTimer,
  stopTimer,
  TAG_LABELS,
  type Draft,
  type Note,
  type Quadrant,
  type Tag,
} from './lib/notes.ts';
import { useOnline } from './lib/pwa.ts';
import { dayKey, dayLabel, greeting } from './lib/today.ts';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

type Load = { state: 'loading' } | { state: 'ready'; tasks: Note[] } | { state: 'error' };

/** The last move or delete, with the task as it was before, so Undo can put it back. */
type Undo = { message: string; before: Note };

export function App() {
  const online = useOnline();
  const now = new Date();
  const today = dayKey(now, timeZone);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [active, setActive] = useState<Quadrant>('do');
  const [undo, setUndo] = useState<Undo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    allNotes()
      .then((tasks) => setLoad({ state: 'ready', tasks }))
      .catch((error: unknown) => {
        console.error('Loading tasks failed', error);
        setLoad({ state: 'error' });
      });
  }, []);

  const tasks = load.state === 'ready' ? load.tasks : [];
  const running = tasks.find((n) => n.startedAt) ?? null;
  const update = (fn: (current: Note[]) => Note[]) =>
    setLoad((prev) => ({ state: 'ready', tasks: fn(prev.state === 'ready' ? prev.tasks : []) }));
  const put = (...changed: Note[]) =>
    update((current) => [...current.filter((n) => !changed.some((c) => c.id === n.id)), ...changed]);

  // Tick once a second only while a timer runs.
  useEffect(() => {
    if (!running) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running?.id]);

  async function save(changed: Note[], undoable?: { message: string; before: Note }) {
    try {
      await Promise.all(changed.map(saveNote));
      put(...changed);
      setNowMs(Date.now());
      if (undoable) setUndo(undoable);
    } catch {
      setToast('Could not save on this device');
    }
  }

  async function add(draft: Draft) {
    const at = new Date();
    const note: Note = { id: crypto.randomUUID(), ...draft, quadrant: active, size: 1, createdAt: at.toISOString(), day: dayKey(at, timeZone) };
    await saveNote(note);
    put(note);
    if (draft.tag === 'done') setToast('Added to Done');
  }

  const setStatus = (note: Note, tag: Tag) => {
    const at = new Date();
    return save([moveNote(note, tag, at, dayKey(at, timeZone))], { message: tag === 'done' ? 'Marked done' : `Status: ${TAG_LABELS[tag]}`, before: note });
  };

  const setQuadrant = (note: Note, quadrant: Quadrant) => {
    // Re-sorting is planning, not progress: the standup day stays as it was.
    setActive(quadrant);
    return save([{ ...note, quadrant }], { message: `Moved to ${QUADRANT_LABELS[quadrant].name}`, before: note });
  };

  function drop(note: Note, target: DropTarget) {
    void (target === 'done' ? setStatus(note, 'done') : setQuadrant(note, target));
  }

  function toggleTimer(note: Note) {
    const at = new Date();
    void save(note.startedAt ? [stopTimer(note, at)] : startTimer(tasks, note.id, at, dayKey(at, timeZone)));
  }

  async function remove(note: Note) {
    try {
      await deleteNote(note.id);
      update((current) => current.filter((n) => n.id !== note.id));
      // Undo brings it back stopped: a deleted task should not keep counting.
      setUndo({ message: 'Task deleted', before: stopTimer(note, new Date()) });
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

  const actions = {
    onStatus: (note: Note, tag: Tag) => void setStatus(note, tag),
    onQuadrant: (note: Note, quadrant: Quadrant) => void setQuadrant(note, quadrant),
    onSize: (note: Note) => void save([{ ...note, size: nextSize(sizeOf(note)) }]),
    onTimer: toggleTimer,
    onDelete: (note: Note) => void remove(note),
  };

  return (
    <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[max(8px,env(safe-area-inset-top))]">
      {/* Material top app bar: supporting date above a large greeting. */}
      <header class="flex items-start justify-between gap-4 pt-4 pb-5">
        <div class="min-w-0">
          <p class="text-sm font-medium tracking-wide text-muted">{dayLabel(now, timeZone)}</p>
          <h1 class="mt-1 text-[1.75rem] leading-9 font-normal">{greeting(now, timeZone)}</h1>
        </div>
        {/* Only worth a word when it changes something: the dashboard keeps working either way. */}
        {!online && (
          <span role="status" class="mt-1 inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-warn">
            <Icon name="offline" class="size-[18px]" />
            Offline
          </span>
        )}
      </header>

      <main class="flex flex-1 flex-col gap-4 pb-4">
        {load.state === 'loading' && <div class="h-40 animate-pulse rounded-3xl bg-surface" aria-label="Loading tasks" />}
        {load.state === 'error' && (
          <p role="alert" class="rounded-3xl bg-surface p-5 text-error">
            Could not open this device's storage. Private mode can block it; try a normal window.
          </p>
        )}
        {load.state === 'ready' && (
          <>
            <Overview stats={stats(tasks, nowMs)} running={running} nowMs={nowMs} onStop={toggleTimer} />
            <Matrix
              views={matrix(tasks, nowMs)}
              done={doneList(tasks, today)}
              today={today}
              nowMs={nowMs}
              active={active}
              onSelect={setActive}
              onDrop={drop}
              {...actions}
            />
          </>
        )}

        <div class="grid gap-4 md:grid-cols-2 md:items-start">
          <StandupCard today={today} cards={tasks} onToast={setToast} />
          <RecapCard today={today} cards={tasks} onToast={setToast} />
        </div>

        <p class="pt-2 text-center text-xs text-muted">DevLog v{__APP_VERSION__} · tasks stored on this device, nothing sent anywhere</p>
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

      <Composer target={QUADRANT_LABELS[active].name} onAdd={add} />
    </div>
  );
}
