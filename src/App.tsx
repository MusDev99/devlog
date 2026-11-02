import { useEffect, useState } from 'preact/hooks';
import { Icon } from './components/Icon.tsx';
import { RecapCard } from './components/RecapCard.tsx';
import { SessionTasks } from './components/SessionTasks.tsx';
import { StandupCard } from './components/StandupCard.tsx';
import { TimerPanel } from './components/TimerPanel.tsx';
import { PLACE_NAMES } from './components/TaskRow.tsx';
import { allNotes, deleteNote, loadSession, saveNote, saveSession } from './lib/db.ts';
import { creditPomodoro, moveNote, TAG_LABELS, type Draft, type Note, type Place, type Size, type Tag } from './lib/notes.ts';
import {
  complete,
  formatClock,
  fullMs,
  isFinished,
  isRunning,
  MODE_LABELS,
  newSession,
  pause,
  remainingMs,
  reset,
  start,
  switchMode,
  type Mode,
  type Session,
} from './lib/pomodoro.ts';
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
  const [session, setSessionState] = useState<Session>(() => loadSession() ?? newSession());
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
  const focusTask = tasks.find((n) => n.id === session.taskId) ?? null;
  const update = (fn: (current: Note[]) => Note[]) =>
    setLoad((prev) => ({ state: 'ready', tasks: fn(prev.state === 'ready' ? prev.tasks : []) }));
  const put = (...changed: Note[]) =>
    update((current) => [...current.filter((n) => !changed.some((c) => c.id === n.id)), ...changed]);
  const setSession = (next: Session) => {
    setSessionState(next);
    saveSession(next);
  };

  async function save(changed: Note[], undoable?: Undo) {
    try {
      await Promise.all(changed.map(saveNote));
      put(...changed);
      if (undoable) setUndo(undoable);
    } catch {
      setToast('Could not save on this device');
    }
  }

  // Tick once a second only while the timer runs.
  useEffect(() => {
    if (!isRunning(session)) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session.endsAt]);

  // A round ran out (also after a reload or a sleeping tab): credit the 🍅 once and set up the next round.
  useEffect(() => {
    if (load.state !== 'ready' || !isFinished(session, nowMs)) return;
    const { next, credit } = complete(session);
    setSession(next);
    const task = credit ? focusTask : null;
    if (task) void save([creditPomodoro(task, fullMs('focus'))]);
    navigator.vibrate?.([200, 100, 200]);
    setToast(
      session.mode === 'focus'
        ? `Focus complete${task ? ' · +1 🍅' : ''} · time for a ${MODE_LABELS[next.mode].toLowerCase()}`
        : `${MODE_LABELS[session.mode]} complete`,
    );
  }, [nowMs, session, load.state]);

  useEffect(() => {
    document.title = isRunning(session) ? `${formatClock(remainingMs(session, nowMs))} · ${MODE_LABELS[session.mode]} · DevLog` : 'DevLog';
  }, [nowMs, session]);

  function startTimer() {
    const at = new Date();
    // Focusing on a task means working on it: the standup sees it as Doing.
    if (session.mode === 'focus' && focusTask && (focusTask.tag === 'todo' || focusTask.tag === 'blocker')) {
      void save([moveNote(focusTask, 'doing', at, dayKey(at, timeZone))]);
    }
    setNowMs(at.getTime());
    setSession(start(session, at.getTime()));
  }

  async function add(draft: Draft, size: Size, focus: boolean) {
    const at = new Date();
    const note: Note = { id: crypto.randomUUID(), ...draft, quadrant: 'unsorted', size, createdAt: at.toISOString(), day: dayKey(at, timeZone) };
    await saveNote(note);
    put(note);
    if (focus && draft.tag !== 'done') setSession({ ...session, taskId: note.id });
    if (draft.tag === 'done') setToast('Added as done');
  }

  const setStatus = (note: Note, tag: Tag) => {
    const at = new Date();
    return save([moveNote(note, tag, at, dayKey(at, timeZone))], { message: tag === 'done' ? 'Marked done' : `Status: ${TAG_LABELS[tag]}`, before: note });
  };

  async function remove(note: Note) {
    try {
      await deleteNote(note.id);
      update((current) => current.filter((n) => n.id !== note.id));
      setUndo({ message: 'Task deleted', before: note });
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
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[max(8px,env(safe-area-inset-top))] pb-6">
      <header class="flex items-center justify-between gap-4 py-4">
        <div class="min-w-0">
          <p class="text-xs font-medium tracking-wide text-muted">{dayLabel(now, timeZone)}</p>
          <h1 class="text-xl font-semibold">{greeting(now, timeZone)}</h1>
        </div>
        {/* Only worth a word when it changes something: everything keeps working offline. */}
        {!online && (
          <span role="status" class="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-warn">
            <Icon name="offline" class="size-[18px]" />
            Offline
          </span>
        )}
      </header>

      <main class="flex flex-1 flex-col gap-4">
        <div class="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start">
          <div class="lg:sticky lg:top-4">
            <TimerPanel
              session={session}
              nowMs={nowMs}
              task={focusTask}
              onMode={(mode: Mode) => setSession(switchMode(session, mode))}
              onStart={startTimer}
              onPause={() => setSession(pause(session, Date.now()))}
              onReset={() => setSession(reset(session))}
            />
          </div>

          {load.state === 'loading' && <div class="h-96 animate-pulse rounded-[28px] bg-surface" aria-label="Loading tasks" />}
          {load.state === 'error' && (
            <p role="alert" class="rounded-[28px] bg-surface p-5 text-error">
              Could not open this device's storage. Private mode can block it; try a normal window.
            </p>
          )}
          {load.state === 'ready' && (
            <SessionTasks
              tasks={tasks}
              today={today}
              focusId={session.taskId}
              onAdd={add}
              onSelect={(note) => setSession({ ...session, taskId: note.id === session.taskId ? null : note.id })}
              onStatus={(note, tag) => void setStatus(note, tag)}
              onPlace={(note: Note, place: Place) => void save([{ ...note, quadrant: place }], { message: `Moved to ${PLACE_NAMES[place]}`, before: note })}
              onSize={(note, size) => void save([{ ...note, size }])}
              onDelete={(note) => void remove(note)}
            />
          )}
        </div>

        <div class="grid gap-4 md:grid-cols-2 md:items-start">
          <StandupCard today={today} cards={tasks} onToast={setToast} />
          <RecapCard today={today} cards={tasks} onToast={setToast} />
        </div>

        <p class="pt-2 text-center text-xs text-muted">DevLog v{__APP_VERSION__} · tasks stored on this device, nothing sent anywhere</p>
      </main>

      <div aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
        {toast && !undo && (
          <div class="pointer-events-auto flex min-h-12 max-w-md items-center gap-2 rounded-2xl bg-inverse py-1 pr-1 pl-4 text-sm font-medium text-on-inverse shadow-lg">
            {toast}
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" class="state-layer grid size-11 shrink-0 place-items-center rounded-full">
              <Icon name="close" class="size-5" />
            </button>
          </div>
        )}
        {undo && (
          <div class="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl bg-inverse py-1 pr-2 pl-4 text-sm text-on-inverse shadow-lg">
            {undo.message}
            <button type="button" onClick={restore} class="state-layer min-h-11 rounded-full px-3 font-medium text-inverse-primary">
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
