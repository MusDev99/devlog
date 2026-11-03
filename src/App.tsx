import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './components/Icon.tsx';
import { Reports } from './components/Reports.tsx';
import { SessionTasks } from './components/SessionTasks.tsx';
import { SettingsDialog } from './components/SettingsDialog.tsx';
import { StatsView } from './components/StatsView.tsx';
import { SyncChip } from './components/SyncChip.tsx';
import { PLACE_NAMES } from './components/TaskRow.tsx';
import { TimerPanel } from './components/TimerPanel.tsx';
import { allNotes, deleteNote, keepStorage, loadPref, loadTargets, saveNote, savePref, saveTargets, type User } from './lib/db.ts';
import { isScreen, launchParams, type Screen } from './lib/launch.ts';
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
import { setBadge, useInstall, useOnline, useUpdate } from './lib/pwa.ts';
import { useSync } from './lib/use-sync.ts';
import { dayKey, dayLabel, greeting } from './lib/today.ts';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const SELECTED_KEY = 'devlog.selected';
const SCREEN_KEY = 'devlog.screen';
const IOS_HINT_KEY = 'devlog.ios-hint';

/** A home-screen shortcut (`?screen=`) wins over the screen used last time. */
const launch = launchParams(location.search);
const savedScreen = (): Screen => {
  const v = loadPref(SCREEN_KEY);
  return launch.screen ?? (isScreen(v) ? v : 'timer');
};

const TABS: { id: Screen; label: string; icon: 'timer' | 'list' | 'chart' }[] = [
  { id: 'timer', label: 'Timer', icon: 'timer' },
  { id: 'tasks', label: 'Tasks', icon: 'list' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
];

type Load = { state: 'loading' } | { state: 'ready'; tasks: Note[] } | { state: 'error' };

/** The last move or delete, with the task as it was before, so Undo can put it back. */
type Undo = { message: string; before: Note };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** `user` is null when the app runs local-only (no sign-in server). */
export function App({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  const online = useOnline();
  const now = new Date();
  const today = dayKey(now, timeZone);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(() => loadPref(SELECTED_KEY));
  const [undo, setUndo] = useState<Undo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const [screen, setScreenState] = useState<Screen>(savedScreen);
  const [targets, setTargets] = useState(loadTargets);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const install = useInstall();
  // Signed in: every change goes to the team's Google Sheet; local-only mode never syncs.
  const sync = useSync(user !== null && load.state === 'ready', load);
  const applyUpdate = useUpdate();
  const [iosHint, setIosHint] = useState(() => install.iosHint && loadPref(IOS_HINT_KEY) !== 'dismissed');
  const setScreen = (next: Screen) => {
    setScreenState(next);
    savePref(SCREEN_KEY, next);
    window.scrollTo({ top: 0 });
  };
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
  const openCount = tasks.filter((t) => t.tag !== 'done').length;
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

  /** Start, pause or resume a task's stopwatch. Starting one pauses any other (one at a time) and selects it. */
  function toggleTimer(note: Note) {
    const at = new Date();
    navigator.vibrate?.(12);
    if (note.startedAt) return void save([stopTimer(note, at)]);
    select(note.id);
    setNowMs(at.getTime());
    void save(startTimer(tasks, note.id, at, dayKey(at, timeZone)));
  }

  const toggle = () => selected && toggleTimer(selected);

  // Opened from a shortcut: clean the URL; "Add a task" puts the cursor in the field.
  useEffect(() => {
    if (!location.search) return;
    history.replaceState(null, '', location.pathname);
    if (launch.newTask) setTimeout(() => document.getElementById('note-text')?.focus(), 300);
  }, []);

  // Installed app: open tasks on the home-screen icon; ask the browser to keep this device's data.
  useEffect(() => setBadge(openCount), [openCount]);
  useEffect(() => {
    if (load.state === 'ready' && tasks.length > 0) void keepStorage();
  }, [load.state, tasks.length > 0]);

  // Keyboard: Space start/pause, N new task. Ignored while typing.
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
      <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[max(8px,env(safe-area-inset-top))] pb-[calc(10rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-8">
        <header class="flex items-center justify-between gap-x-4 py-4">
          <div class="flex min-w-0 items-baseline gap-3">
            <p class="text-lg font-bold tracking-tight">
              Dev<span class="text-accent">Log</span>
            </p>
            <p class="truncate text-sm text-muted">
              {greeting(now, timeZone)} · {dayLabel(now, timeZone)}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2 lg:order-last">
            {/* Only worth a word when it changes something: everything keeps working offline. */}
            {!online && (
              <span role="status" class="inline-flex h-8 items-center gap-2 rounded-full bg-warn/15 px-3 text-sm font-medium text-warn">
                <Icon name="offline" class="size-[18px]" />
                <span class="hidden sm:inline">Offline</span>
              </span>
            )}
            <SyncChip status={sync.status} onRetry={sync.retry} />
            {install.canInstall && (
              <button
                type="button"
                onClick={() => void install.install()}
                class="press state-layer inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent"
              >
                <Icon name="download" class="size-[18px]" />
                Install
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={user ? `Account and settings: ${user.email}` : 'Settings: daily targets'}
              title={user ? user.email : 'Daily targets'}
              class="press state-layer grid size-11 place-items-center rounded-full bg-surface-high text-muted hover:text-fg"
            >
              {user ? (
                <span aria-hidden="true" class="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent uppercase">
                  {(user.name || user.email).trim().charAt(0)}
                </span>
              ) : (
                <Icon name="settings" class="size-5" />
              )}
            </button>
          </div>

          {/* Wide screens: Focus (timer + tasks side by side) / Stats in the header. Phones use the bottom tab bar. */}
          <nav aria-label="Screens" class="hidden lg:block lg:flex-1 lg:px-6">
            <div role="tablist" class="mx-auto grid max-w-xs grid-cols-2 gap-1 rounded-full bg-surface-high/80 p-1">
              {(['timer', 'stats'] as const).map((id) => {
                const active = id === 'stats' ? screen === 'stats' : screen !== 'stats';
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setScreen(id)}
                    class={`press flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                      active ? 'bg-surface-highest text-fg shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <Icon name={id === 'stats' ? 'chart' : 'timer'} class="size-[18px]" />
                    {id === 'stats' ? 'Stats' : 'Focus'}
                    {id === 'timer' && running && !active && <span aria-label="running" class="size-2 animate-glow rounded-full bg-accent" />}
                  </button>
                );
              })}
            </div>
          </nav>
        </header>

        {iosHint && (
          <div role="note" class="mb-4 flex animate-rise items-center gap-3 rounded-2xl bg-surface-high px-4 py-2 text-sm lg:hidden">
            <Icon name="download" class="size-5 shrink-0 text-accent" />
            <p class="min-w-0 flex-1 leading-5">
              Install DevLog: tap <Icon name="share" class="inline size-4 align-[-3px]" /> <b class="font-semibold">Share</b>, then <b class="font-semibold">Add to Home Screen</b>.
            </p>
            <button
              type="button"
              onClick={() => {
                setIosHint(false);
                savePref(IOS_HINT_KEY, 'dismissed');
              }}
              aria-label="Dismiss install hint"
              class="press state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted"
            >
              <Icon name="close" class="size-5" />
            </button>
          </div>
        )}

        {screen === 'stats' && (
          <main class="flex-1">
            {load.state === 'ready' ? (
              <StatsView tasks={tasks} today={today} nowMs={nowMs} timeZone={timeZone} targets={targets} onEditTargets={() => setSettingsOpen(true)} />
            ) : (
              <div class="h-96 animate-pulse rounded-[28px] bg-surface" aria-label="Loading stats" />
            )}
          </main>
        )}

        <main
          class={`grid flex-1 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start lg:gap-8 ${screen === 'stats' ? 'hidden' : ''}`}
        >
          <div ref={timerRef} class={screen === 'tasks' ? 'hidden lg:block' : ''}>
            <TimerPanel
              task={selected}
              nowMs={nowMs}
              onToggle={toggle}
              onReset={() => selected && void save([resetTimer(selected)], { message: 'Timer reset to 00:00', before: selected })}
              onDone={() => selected && void setStatus(selected, 'done')}
            />
          </div>

          <div class={`lg:row-span-2 ${screen === 'timer' ? 'hidden lg:block' : ''}`}>
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

          <div class={`lg:col-start-1 ${screen === 'tasks' ? 'hidden lg:block' : ''}`}>
            <Reports today={today} tasks={tasks} onToast={setToast} />
          </div>
        </main>

        <footer class="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <span class="hidden items-center gap-1.5 [@media(hover:hover)]:inline-flex">
            <Icon name="keyboard" class="size-4" />
            <kbd class="rounded bg-surface-high px-1.5 py-0.5 font-sans">Space</kbd> start/pause
            <kbd class="rounded bg-surface-high px-1.5 py-0.5 font-sans">N</kbd> new task
          </span>
          <span>DevLog v{__APP_VERSION__} · stored on this device only</span>
        </footer>
      </div>

      <SettingsDialog
        open={settingsOpen}
        user={user}
        onSignOut={onSignOut}
        targets={targets}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => {
          setTargets(next);
          saveTargets(next);
          setSettingsOpen(false);
          setToast('Daily targets saved');
        }}
      />

      {/* Phone: bottom tab bar in thumb reach (Fitts), the pattern people know from native apps (Jakob). */}
      <nav
        aria-label="Screens"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div role="tablist" class="mx-auto grid max-w-md grid-cols-3">
          {TABS.map((tab) => {
            const active = screen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScreen(tab.id)}
                class={`press flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${active ? 'text-fg' : 'text-muted'}`}
              >
                <span class={`relative grid h-8 w-16 place-items-center rounded-full transition-colors ${active ? 'bg-accent/20 text-accent' : ''}`}>
                  <Icon name={tab.icon} class="size-[22px]" />
                  {tab.id === 'tasks' && openCount > 0 && (
                    <span class="absolute -top-1 right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent tabular-nums">
                      {openCount}
                    </span>
                  )}
                  {tab.id === 'timer' && running && <span aria-label="running" class="absolute top-0.5 right-4 size-2 animate-glow rounded-full bg-accent" />}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {showMini && (
        <div class="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 animate-rise px-3 lg:hidden">
          <div class="mx-auto flex max-w-md items-center gap-3 rounded-full border border-line/70 bg-surface-high/95 py-1.5 pr-1.5 pl-4 shadow-2xl shadow-black/40 backdrop-blur">
            <span aria-hidden="true" class={`size-2 shrink-0 rounded-full bg-accent ${running ? 'animate-glow' : ''}`} />
            <span class="text-lg font-semibold tabular-nums">{formatClock(selected ? elapsedMs(selected, nowMs) : 0)}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-muted">{selected?.text}</span>
            <button
              type="button"
              onClick={toggle}
              aria-label={running ? 'Pause' : 'Start'}
              class="press state-layer grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
            >
              <Icon name={running ? 'pause' : 'play'} class="size-5" />
            </button>
          </div>
        </div>
      )}

      <div
        aria-live="polite"
        class={`pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 ${
          showMini ? 'bottom-[calc(9rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
        }`}
      >
        {applyUpdate && (
          <div class="pointer-events-auto flex w-full max-w-sm animate-rise items-center justify-between gap-3 rounded-2xl bg-inverse py-1 pr-2 pl-4 text-sm font-medium text-on-inverse shadow-2xl">
            New version ready
            <button type="button" onClick={applyUpdate} class="state-layer min-h-11 rounded-full px-3 font-semibold text-inverse-primary">
              Reload
            </button>
          </div>
        )}
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
