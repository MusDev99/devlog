import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { loadPref, savePref } from '../lib/db.ts';
import { buzz } from '../lib/haptics.ts';
import { plainText } from '../lib/links.ts';
import { doneBucket, listView, places, progressCount } from '../lib/matrix.ts';
import { PLACES, placeOf, QUADRANT_LABELS, sizeOf, type Draft, type Note, type Place, type Size } from '../lib/notes.ts';
import { Composer } from './Composer.tsx';
import { NewActivity } from './NewActivity.tsx';
import { DoneBucket } from './DoneBucket.tsx';
import { Icon } from './Icon.tsx';
import { useStable } from '../lib/use-clock.ts';
import { dragState } from '../lib/use-swipe.ts';
import { RowSheet } from './RowSheet.tsx';
import { PLACE_TONE, TaskRow, type RowActions } from './TaskRow.tsx';

type Props = Omit<RowActions, 'onMenu'> & {
  tasks: Note[];
  today: string;
  focusId: string | null;
  /** The daily story-point target, shown against today's finished points. */
  targetPoints: number;
  onAdd: (draft: Draft, size: Size, focus: boolean) => Promise<void>;
  /** The guided New activity flow (phones): the same add, with the quadrant chosen up front. */
  onAddGuided: (draft: Draft, size: Size, place: Place) => Promise<void>;
};

type View = 'list' | 'matrix';
/** Where a dragged task can land: a place, or the Done bucket (finishes it). */
type Target = Place | 'done';
type Drag = { note: Note; x: number; y: number; over: Target | null };
type Pending = { note: Note; x: number; y: number; touch: boolean; timer?: ReturnType<typeof setTimeout> };

const LONG_PRESS_MS = 350;
const VIEW_KEY = 'devlog.view';

/** The drop target under a point: any element marked `data-drop` (Unsorted, a quadrant, or Done). */
function placeAt(x: number, y: number): Target | null {
  const value = document.elementFromPoint(x, y)?.closest('[data-drop]')?.getAttribute('data-drop');
  return value === 'done' || PLACES.includes(value as Place) ? (value as Target) : null;
}

/** The drag ghost is centred on the pointer and tilted; moving it is a transform only (no layout). */
const ghostAt = (x: number, y: number) => `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(2deg)`;

const COLLAPSED_KEY = 'devlog.collapsed';
const savedCollapsed = (): Place[] => {
  try {
    const value: unknown = JSON.parse(loadPref(COLLAPSED_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((p): p is Place => PLACES.includes(p as Place)) : [];
  } catch {
    return [];
  }
};

const savedView = (): View => (loadPref(VIEW_KEY) === 'list' ? 'list' : 'matrix');

/**
 * Session Tasks: add row, List / Matrix switch, Unsorted strip and the four quadrants.
 * Drag a row with the mouse, or long-press then drag on touch (a plain swipe still scrolls);
 * the row menu moves it without dragging.
 */
export function SessionTasks({ tasks, today, focusId, targetPoints, onAdd, onAddGuided, ...actions }: Props) {
  const [view, setView] = useState<View>(savedView);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(savedCollapsed);
  const dragRef = useRef<Drag | null>(null);
  const pending = useRef<Pending | null>(null);
  const suppressClick = useRef(false);
  const ghost = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  // Listeners bind once and read the latest handlers here; rows get one stable bundle so memoised rows are not re-rendered.
  const act = useRef(actions);
  act.current = actions;
  const rowActions = useMemo<RowActions>(
    () => ({
      onSelect: (note) => !suppressClick.current && act.current.onSelect(note),
      onTimer: (note) => act.current.onTimer(note),
      onStatus: (note, tag) => act.current.onStatus(note, tag),
      onPlace: (note, place) => act.current.onPlace(note, place),
      onSize: (note, size) => act.current.onSize(note, size),
      onDelete: (note) => act.current.onDelete(note),
      onMenu: (note) => setMenuId(note.id),
    }),
    [],
  );
  // A non-passive touchmove blocks the browser's scrolling, so it is armed only for a touch that starts on a row.
  const guard = useRef((e: TouchEvent) => {
    if (dragRef.current) e.preventDefault();
  });
  const arm = () => window.addEventListener('touchmove', guard.current, { passive: false });
  const disarm = () => window.removeEventListener('touchmove', guard.current);
  const { done, total } = useMemo(() => progressCount(tasks, today), [tasks, today]);
  const points = useMemo(() => tasks.reduce((sum, t) => (t.tag === 'done' && t.day === today ? sum + sizeOf(t) : sum), 0), [tasks, today]);
  const toggleQuadrant = (place: Place) =>
    setCollapsed((current) => {
      const next = current.includes(place) ? current.filter((p) => p !== place) : [...current, place];
      savePref(COLLAPSED_KEY, JSON.stringify(next));
      return next;
    });

  const begin = (p: Pending, x: number, y: number) => {
    const d = { note: p.note, x, y, over: placeAt(x, y) };
    dragRef.current = d;
    dragState.active = true;
    setDrag({ ...d });
    if (p.touch) buzz('grab');
  };
  const clearPending = () => {
    if (pending.current?.timer) clearTimeout(pending.current.timer);
    pending.current = null;
  };

  useEffect(() => {
    /** Follow the pointer without re-rendering: the ghost moves by transform, the drop target is read once a frame. */
    const settle = () => {
      frame.current = null;
      const d = dragRef.current;
      if (!d) return;
      if (d.y < 72) window.scrollBy(0, -12);
      else if (d.y > window.innerHeight - 72) window.scrollBy(0, 12);
      const over = placeAt(d.x, d.y);
      if (over !== d.over) {
        d.over = over;
        setDrag({ ...d });
      }
    };
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d) {
        d.x = e.clientX;
        d.y = e.clientY;
        if (ghost.current) ghost.current.style.transform = ghostAt(d.x, d.y);
        frame.current ??= requestAnimationFrame(settle);
        return;
      }
      const p = pending.current;
      if (!p) return;
      const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (!p.touch && moved > 6) {
        clearPending();
        begin(p, e.clientX, e.clientY);
      } else if (p.touch && moved > 8) {
        clearPending(); // a swipe: let the page scroll
        disarm();
      }
    };
    const up = (e: PointerEvent) => {
      clearPending();
      disarm();
      const d = dragRef.current;
      if (!d) return;
      stop();
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      const over = placeAt(e.clientX, e.clientY);
      if (over === 'done') act.current.onStatus(d.note, 'done');
      else if (over && over !== placeOf(d.note)) act.current.onPlace(d.note, over);
    };
    const stop = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      dragRef.current = null;
      dragState.active = false;
      setDrag(null);
    };
    const cancel = () => {
      clearPending();
      disarm();
      stop();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && cancel();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      disarm();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const rowPointerDown = useStable((note: Note, e: PointerEvent) => {
    if (e.button !== 0 || view !== 'matrix') return;
    // The done toggle and the menu stay plain buttons.
    if ((e.target as Element).closest('button:not([data-row-main]), select, input, a')) return;
    const p: Pending = { note, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
    if (p.touch) {
      arm();
      p.timer = setTimeout(() => pending.current === p && (clearPending(), begin(p, p.x, p.y)), LONG_PRESS_MS);
    }
    pending.current = p;
  });

  const row = (note: Note, showPlace = false) => (
    <TaskRow key={note.id} note={note} focused={note.id === focusId} showPlace={showPlace} onPointerDown={rowPointerDown} {...rowActions} />
  );
  // Drop zones light up in their own colour while a task hovers them.
  const ring = (place: Place) =>
    drag?.over === place && drag.over !== placeOf(drag.note) ? `outline-2 outline-dashed outline-offset-2 ${PLACE_TONE[place].ring}` : '';
  const doneRing = drag?.over === 'done' ? 'outline-2 outline-dashed outline-offset-2 outline-ok' : '';
  const switchView = (v: View) => {
    setView(v);
    savePref(VIEW_KEY, v);
  };

  const views = useMemo(() => places(tasks), [tasks]);
  const unsorted = views[0];
  const list = useMemo(() => (view === 'list' ? listView(tasks) : null), [tasks, view]);
  const finished = useMemo(() => doneBucket(tasks, today), [tasks, today]);

  return (
    <section aria-labelledby="tasks-title" class={drag ? 'select-none [&_li]:pointer-events-none' : ''}>
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <h2 id="tasks-title" class="text-lg font-semibold">
              Tasks
            </h2>
            <span class="text-sm text-muted tabular-nums" aria-label={`${done} of ${total} done`}>
              {done}/{total}
            </span>
            {/* Goal-gradient: today's points toward the target; the number pops when it moves. */}
            {targetPoints > 0 && (
              <span
                key={points}
                aria-label={`${points} of ${targetPoints} story points today`}
                class={`animate-pop inline-flex items-center gap-1 text-xs font-medium tabular-nums ${points >= targetPoints ? 'text-ok' : 'text-muted'}`}
              >
                {points >= targetPoints && <Icon name="check" class="size-3.5" />}· {points}/{targetPoints} SP today
              </span>
            )}
          </div>
          {/* Goal-gradient: the bar fills as tasks get done. */}
          <div aria-hidden="true" class="mt-2 h-1 overflow-hidden rounded-full bg-surface-high">
            <div class="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div role="tablist" aria-label="Task view" class="flex shrink-0 rounded-full bg-surface-high p-1">
          {(['list', 'matrix'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              aria-label={v === 'list' ? 'List' : 'Matrix'}
              title={v === 'list' ? 'List' : 'Matrix'}
              onClick={() => switchView(v)}
              class={`press grid size-11 place-items-center rounded-full transition-colors ${view === v ? 'bg-surface-highest text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              <Icon name={v === 'list' ? 'list' : 'grid'} class="size-5" />
            </button>
          ))}
        </div>
      </div>

      <div class="mt-4">
        <Composer onAdd={onAdd} />
        <NewActivity onAdd={onAddGuided} />
      </div>

      {list && (
        <div class="mt-4">
          {list.length === 0 && <p class="px-1 py-10 text-center text-sm text-muted">Nothing open. Add a task above.</p>}
          <ul class="grid gap-1.5">{list.map((n) => row(n, true))}</ul>
        </div>
      )}

      {view === 'matrix' && unsorted && (
        <>
          {/* Unsorted only takes space when it holds something, or while a task could be dropped back in. */}
          {(unsorted.tasks.length > 0 || drag) && (
            <div data-drop="unsorted" class={`mt-4 animate-rise rounded-2xl border border-dashed border-line p-2.5 ${PLACE_TONE.unsorted.tint} ${ring('unsorted')}`}>
              <div class="flex items-center justify-between gap-2 px-1.5 pb-2">
                <h3 class="text-sm font-semibold">Unsorted</h3>
                <span class="text-xs text-muted">{unsorted.tasks.length > 0 ? 'Drag into a quadrant' : 'Drop here to unsort'}</span>
              </div>
              <ul class="grid gap-1.5">{unsorted.tasks.map((n) => row(n))}</ul>
            </div>
          )}

          <div class="mt-5 hidden grid-cols-2 gap-3 text-center text-[11px] font-semibold tracking-[0.16em] text-muted uppercase md:grid">
            <span>Urgent</span>
            <span>Not urgent</span>
          </div>
          <div class="mt-4 grid gap-3 md:mt-2 md:grid-cols-2">
            {views.slice(1).map((v) => {
              if (v.place === 'unsorted') return null;
              const label = QUADRANT_LABELS[v.place];
              const tone = PLACE_TONE[v.place];
              const shut = collapsed.includes(v.place);
              // A phone does not need 160 px of empty box: only a quadrant with tasks gets height there.
              const tall = v.tasks.length > 0 && !shut ? 'min-h-40' : '';
              return (
                <section
                  key={v.place}
                  data-drop={v.place}
                  aria-labelledby={`q-${v.place}`}
                  class={`flex flex-col rounded-2xl p-2.5 transition-[outline-color] ${tall} md:min-h-56 lg:min-h-[clamp(14rem,30vh,22rem)] ${tone.tint} ${ring(v.place)}`}
                >
                  <header class="flex items-center justify-between gap-2 px-1.5 pb-1" title={label.hint}>
                    <h3 id={`q-${v.place}`} class="min-w-0 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleQuadrant(v.place)}
                        aria-expanded={!shut}
                        class="press flex min-h-11 min-w-0 items-center gap-2 rounded-lg pr-1 text-left"
                      >
                        <span aria-hidden="true" class={`size-2 shrink-0 rounded-full ${tone.dot}`} />
                        <span class={tone.text}>{label.name}</span>
                        <span class="truncate text-xs font-normal text-muted">
                          {label.badge}
                          <span class="hidden sm:inline"> · {label.hint}</span>
                        </span>
                        <Icon name="expand" class={`size-5 shrink-0 text-muted transition-transform duration-200 ${shut ? '-rotate-90' : ''}`} />
                      </button>
                    </h3>
                    <span class="shrink-0 text-xs text-muted tabular-nums" aria-label={`${v.open} open, ${v.points} story points`}>
                      {v.open > 0 ? `${v.open} · ${v.points} SP` : ''}
                    </span>
                  </header>
                  {shut ? null : v.tasks.length === 0 ? (
                    <p class="grid flex-1 place-items-center rounded-xl border border-dashed border-line/70 px-3 py-3 text-center text-xs text-muted">Drag a task here</p>
                  ) : (
                    <ul class="grid gap-1.5">{v.tasks.map((n) => row(n))}</ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <RowSheet
        note={tasks.find((t) => t.id === menuId) ?? null}
        onClose={() => setMenuId(null)}
        onPlace={actions.onPlace}
        onStatus={actions.onStatus}
        onSize={actions.onSize}
        onDelete={actions.onDelete}
      />

      <DoneBucket
        recent={finished.recent}
        earlier={finished.earlier}
        today={today}
        nowMs={Date.now()}
        dropRing={doneRing}
        dragging={drag !== null}
        onRestore={(note) => actions.onStatus(note, 'todo')}
        onDelete={rowActions.onDelete}
      />

      {drag && (
        <div
          ref={ghost}
          aria-hidden="true"
          style={{ transform: ghostAt(dragRef.current?.x ?? drag.x, dragRef.current?.y ?? drag.y) }}
          class="pointer-events-none fixed top-0 left-0 z-50 max-w-64 truncate rounded-xl bg-surface-highest px-4 py-3 text-sm font-medium shadow-2xl ring-2 ring-accent will-change-transform"
        >
          {plainText(drag.note.text)}
        </div>
      )}
    </section>
  );
}
