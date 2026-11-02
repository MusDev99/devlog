import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './components/Icon.tsx';
import { Reports } from './components/Reports.tsx';
import { SessionTasks } from './components/SessionTasks.tsx';
import { PLACE_NAMES } from './components/TaskRow.tsx';
import { TimerPanel } from './components/TimerPanel.tsx';
import { allNotes, deleteNote, loadPref, saveNote, savePref } from './lib/db.ts';
import {
  elapsedMs,
  formatClock,
  moveNote,
  resetTimer,
  startTimer,
  stopTimer,
  TAG_LABELS,
  type Draft,
  type Note,
  type Place,
  type Size,
  type Tag,
} from './lib/notes.ts';
import { useOnline } from './lib/pwa.ts';
import { dayKey, dayLabel, greeting } from './lib/today.ts';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const SELECTED_KEY = 'devlog.selected';

type Load = { state: 'loading' } | { state: 'ready'; tasks: Note[] } | { state: 'error' };

/** The last move or delete, with the task as it was before, so Undo can put it back. */
type Undo = { message: string; before: Note };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function App() {
  const online = useOnline();
  const now = new Date();
  const today = dayKey(now, timeZone);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(() => loadPref(SELECTED_KEY));
  const [undo, setUndo] = useState<Undo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const [timerVisible, setTimerVisible] = useState(true);

  useEffect(() => {
    allNotes()
      .then((tasks) => setLoad({ state: 'ready', tasks }))
      .catch((error: unknown) => {
        console.error('Loading tasks failed', error);
        setLoad({ state: 'error' });
      });
  }, []);

  const tasks = load.state === 'ready' ? load.tasks : [];
  // The running task is always the one on the clock; otherwise the last one picked.
  const runningTask = tasks.find((n) => n.startedAt) ?? null;
  const selected = runningTask ?? tasks.find((n) => n.id === selectedId && n.tag !== 'done') ?? null;
  const running = runningTask !== null;
  const update = (fn: (current: Note[]) => Note[]) =>
    setLoad((prev) => ({ state: 'ready', tasks: fn(prev.state === 'ready' ? prev.tasks : []) }));
  const put = (...changed: Note[]) =>
    update((current) => [...current.filter((n) => !changed.some((c) => c.id === n.id)), ...changed]);
  const select = (id: string | null) => {
    setSelectedId(id);
    savePref(SELECTED_KEY, id ?? '');
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

  // Tick once a second only while a stopwatch runs.
  useEffect(() => {
    if (!running) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [runningTask?.id]);

  useEffect(() => {
    document.title = runningTask ? `${formatClock(elapsedMs(runningTask, nowMs))} · ${runningTask.text}` : 'DevLog';
  }, [nowMs, runningTask]);

  // Phone: once the big timer scrolls away, a mini player keeps play/pause in thumb reach (Fitts).
  useEffect(() => {
    const el = timerRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setTimerVisible(entry?.isIntersecting ?? true), { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** Start or stop a task's stopwatch. Starting one stops any other (one at a time) and selects it. */
  function toggleTimer(note: Note) {
    const at = new Date();
    if (note.startedAt) return void save([stopTimer(note, at)]);
    select(note.id);
    setNowMs(at.getTime());
    void save(startTimer(tasks, note.id, at, dayKey(at, timeZone)));
  }

  const toggle = () => selected && toggleTimer(selected);

  // Keyboard: Space start/stop, N new task. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'n' || e.key === '/') {
        e.preventDefault();
        document.getElementById('note-text')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function add(draft: Draft, size: Size, focus: boolean) {
    const at = new Date();
    const note: Note = { id: crypto.randomUUID(), ...draft, quadrant: 'unsorted', size, createdAt: at.toISOString(), day: dayKey(at, timeZone) };
    await saveNote(note);
    put(note);
    if (focus && draft.tag !== 'done') {
      setNowMs(at.getTime());
      select(note.id);
      await save(startTimer([...tasks, note], note.id, at, dayKey(at, timeZone)));
    }
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

  const showMini = !timerVisible && selected !== null;

  return (
    <div data-mode={running ? 'running' : 'idle'} class="mode-wash min-h-dvh">
      <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[max(8px,env(safe-area-inset-top))] pb-24 lg:px-6 lg:pb-8">
        <header class="flex items-center justify-between gap-4 py-4">
          <div class="flex min-w-0 items-baseline gap-3">
            <p class="text-lg font-bold tracking-tight">
              Dev<span class="text-accent">Log</span>
            </p>
            <p class="truncate text-sm text-muted">
              {greeting(now, timeZone)} · {dayLabel(now, timeZone)}
            </p>
          </div>
          {/* Only worth a word when it changes something: everything keeps working offline. */}
          {!online && (
            <span role="status" class="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-warn/15 px-3 text-sm font-medium text-warn">
              <Icon name="offline" class="size-[18px]" />
              Offline
            </span>
          )}
        </header>

        <main class="grid flex-1 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div ref={timerRef}>
            <TimerPanel
              task={selected}
              nowMs={nowMs}
              onToggle={toggle}
              onReset={() => selected && void save([resetTimer(selected)], { message: 'Timer reset to 00:00', before: selected })}
              onDone={() => selected && void setStatus(selected, 'done')}
            />
          </div>

          <div class="lg:row-span-2">
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
                nowMs={nowMs}
                focusId={selected?.id ?? null}
                onAdd={add}
                onSelect={(note) => select(note.id === selected?.id && !note.startedAt ? null : note.id)}
                onTimer={toggleTimer}
                onStatus={(note, tag) => void setStatus(note, tag)}
                onPlace={(note: Note, place: Place) => void save([{ ...note, quadrant: place }], { message: `Moved to ${PLACE_NAMES[place]}`, before: note })}
                onSize={(note, size) => void save([{ ...note, size }])}
                onDelete={(note) => void remove(note)}
              />
            )}
          </div>

          <div class="lg:col-start-1">
            <Reports today={today} tasks={tasks} onToast={setToast} />
          </div>
        </main>

        <footer class="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <span class="hidden items-center gap-1.5 [@media(hover:hover)]:inline-flex">
            <Icon name="keyboard" class="size-4" />
            <kbd class="rounded bg-surface-high px-1.5 py-0.5 font-sans">Space</kbd> start/stop
            <kbd class="rounded bg-surface-high px-1.5 py-0.5 font-sans">N</kbd> new task
          </span>
          <span>DevLog v{__APP_VERSION__} · stored on this device only</span>
        </footer>
      </div>

      {showMini && (
        <div class="fixed inset-x-0 bottom-0 z-40 animate-rise px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
          <div class="mx-auto flex max-w-md items-center gap-3 rounded-full border border-line/70 bg-surface-high/95 py-1.5 pr-1.5 pl-4 shadow-2xl shadow-black/40 backdrop-blur">
            <span aria-hidden="true" class={`size-2 shrink-0 rounded-full bg-accent ${running ? 'animate-glow' : ''}`} />
            <span class="text-lg font-semibold tabular-nums">{formatClock(selected ? elapsedMs(selected, nowMs) : 0)}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-muted">{selected?.text}</span>
            <button
              type="button"
              onClick={toggle}
              aria-label={running ? 'Stop' : 'Start'}
              class="press state-layer grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
            >
              <Icon name={running ? 'stop' : 'play'} class="size-5" />
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite" class={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${showMini ? 'bottom-24' : 'bottom-6'}`}>
        {toast && !undo && (
          <div class="pointer-events-auto flex min-h-12 max-w-md animate-rise items-center gap-2 rounded-2xl bg-inverse py-1 pr-1 pl-4 text-sm font-medium text-on-inverse shadow-2xl">
            {toast}
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" class="state-layer grid size-11 shrink-0 place-items-center rounded-full">
              <Icon name="close" class="size-5" />
            </button>
          </div>
        )}
        {undo && (
          <div class="pointer-events-auto flex w-full max-w-sm animate-rise items-center justify-between gap-3 rounded-2xl bg-inverse py-1 pr-2 pl-4 text-sm font-medium text-on-inverse shadow-2xl">
            {undo.message}
            <button type="button" onClick={restore} class="state-layer min-h-11 rounded-full px-3 font-semibold text-inverse-primary">
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
