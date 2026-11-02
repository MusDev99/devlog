import { useEffect, useRef, useState } from 'preact/hooks';
import { loadPref, savePref } from '../lib/db.ts';
import { listView, places, progressCount } from '../lib/matrix.ts';
import { PLACES, placeOf, QUADRANT_LABELS, type Draft, type Note, type Place, type Size } from '../lib/notes.ts';
import { Composer } from './Composer.tsx';
import { Icon } from './Icon.tsx';
import { PLACE_TONE, TaskRow, type RowActions } from './TaskRow.tsx';

type Props = RowActions & {
  tasks: Note[];
  today: string;
  focusId: string | null;
  onAdd: (draft: Draft, size: Size, focus: boolean) => Promise<void>;
};

type View = 'list' | 'matrix';
type Drag = { note: Note; x: number; y: number; over: Place | null };
type Pending = { note: Note; x: number; y: number; touch: boolean; timer?: ReturnType<typeof setTimeout> };

const LONG_PRESS_MS = 350;
const VIEW_KEY = 'devlog.view';

/** The place under a point: any element marked `data-drop` (Unsorted or a quadrant). */
function placeAt(x: number, y: number): Place | null {
  const value = document.elementFromPoint(x, y)?.closest('[data-drop]')?.getAttribute('data-drop');
  return PLACES.includes(value as Place) ? (value as Place) : null;
}

const savedView = (): View => (loadPref(VIEW_KEY) === 'list' ? 'list' : 'matrix');

/**
 * Session Tasks: add row, List / Matrix switch, Unsorted strip and the four quadrants.
 * Drag a row with the mouse, or long-press then drag on touch (a plain swipe still scrolls);
 * the row menu moves it without dragging.
 */
export function SessionTasks({ tasks, today, focusId, onAdd, ...actions }: Props) {
  const [view, setView] = useState<View>(savedView);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pending = useRef<Pending | null>(null);
  const suppressClick = useRef(false);
  // Listeners bind once; the latest handler is read at drop time.
  const onPlace = useRef(actions.onPlace);
  onPlace.current = actions.onPlace;
  const { done, total } = progressCount(tasks, today);

  const begin = (p: Pending, x: number, y: number) => {
    const d = { note: p.note, x, y, over: placeAt(x, y) };
    dragRef.current = d;
    setDrag(d);
    if (p.touch) navigator.vibrate?.(10);
  };
  const clearPending = () => {
    if (pending.current?.timer) clearTimeout(pending.current.timer);
    pending.current = null;
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d) {
        if (e.clientY < 72) window.scrollBy(0, -12);
        else if (e.clientY > window.innerHeight - 72) window.scrollBy(0, 12);
        const next = { ...d, x: e.clientX, y: e.clientY, over: placeAt(e.clientX, e.clientY) };
        dragRef.current = next;
        setDrag(next);
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
      }
    };
    const up = (e: PointerEvent) => {
      clearPending();
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDrag(null);
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      const over = placeAt(e.clientX, e.clientY);
      if (over && over !== placeOf(d.note)) onPlace.current(d.note, over);
    };
    const cancel = () => {
      clearPending();
      dragRef.current = null;
      setDrag(null);
    };
    // Once a touch drag has begun, stop the page from scrolling under it.
    const touchMove = (e: TouchEvent) => dragRef.current && e.preventDefault();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && cancel();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('keydown', key);
    };
  }, []);

  function rowPointerDown(note: Note, e: PointerEvent) {
    if (e.button !== 0 || view !== 'matrix') return;
    // The done toggle and the menu stay plain buttons.
    if ((e.target as Element).closest('button:not([data-row-main]), select, input')) return;
    const p: Pending = { note, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
    if (p.touch) p.timer = setTimeout(() => pending.current === p && (clearPending(), begin(p, p.x, p.y)), LONG_PRESS_MS);
    pending.current = p;
  }

  const rowActions: RowActions = { ...actions, onSelect: (note) => !suppressClick.current && actions.onSelect(note) };
  const row = (note: Note, showPlace = false) => (
    <TaskRow key={note.id} note={note} focused={note.id === focusId} showPlace={showPlace} onPointerDown={rowPointerDown} {...rowActions} />
  );
  const ring = (place: Place) => (drag?.over === place && drag.over !== placeOf(drag.note) ? 'outline-2 outline-dashed outline-primary' : '');
  const switchView = (v: View) => {
    setView(v);
    savePref(VIEW_KEY, v);
  };

  const views = places(tasks, today);
  const unsorted = views[0];
  const list = view === 'list' ? listView(tasks, today) : null;

  return (
    <section aria-labelledby="tasks-title" class={`rounded-[28px] border border-line/60 bg-surface p-4 sm:p-5 ${drag ? 'select-none' : ''}`}>
      <div class="flex items-center justify-between gap-3">
        <h2 id="tasks-title" class="text-lg font-semibold">
          Session Tasks
        </h2>
        <span class="rounded-full bg-primary-container px-2.5 py-0.5 text-xs font-semibold text-on-primary-container tabular-nums" aria-label={`${done} of ${total} done`}>
          {done}/{total}
        </span>
      </div>

      <div class="mt-4">
        <Composer onAdd={onAdd} />
      </div>

      <div role="tablist" aria-label="Task view" class="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-surface-high p-1">
        {(['list', 'matrix'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => switchView(v)}
            class={`state-layer min-h-11 rounded-xl text-sm font-semibold ${view === v ? 'bg-bg text-fg shadow-sm' : 'text-muted'}`}
          >
            {v === 'list' ? 'List' : 'Matrix'}
          </button>
        ))}
      </div>

      {list && (
        <div class="mt-4">
          {list.tasks.length === 0 && <p class="px-1 py-6 text-center text-sm text-muted">No tasks yet. Add one above.</p>}
          <ul class="grid gap-1.5">{list.tasks.map((n) => row(n, true))}</ul>
          {list.earlier.length > 0 && (
            <details class="group mt-3">
              <summary class="state-layer flex min-h-11 cursor-pointer list-none items-center justify-between rounded-full px-3 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
                Done earlier · {list.earlier.length}
                <Icon name="expand" class="size-6 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <ul class="mt-2 grid gap-1.5">{list.earlier.map((n) => row(n, true))}</ul>
            </details>
          )}
        </div>
      )}

      {view === 'matrix' && unsorted && (
        <>
          <div data-drop="unsorted" class={`mt-4 rounded-2xl border border-dashed border-outline/60 p-3 ${ring('unsorted')}`}>
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-semibold">Unsorted</h3>
              <span class="text-xs text-muted tabular-nums">{unsorted.open}</span>
            </div>
            {unsorted.tasks.length === 0 ? (
              <p class="mt-1 text-xs text-muted">All sorted ✓ Drop a task here to unsort it.</p>
            ) : (
              <ul class="mt-2 grid gap-1.5">{unsorted.tasks.map((n) => row(n))}</ul>
            )}
          </div>

          <div class="mt-4 hidden grid-cols-2 gap-3 text-center text-[11px] font-semibold tracking-widest text-muted uppercase md:grid">
            <span>Urgent</span>
            <span>Not urgent</span>
          </div>
          <div class="mt-3 grid gap-3 md:mt-2 md:grid-cols-2">
            {views.slice(1).map((v) => {
              if (v.place === 'unsorted') return null;
              const label = QUADRANT_LABELS[v.place];
              const tone = PLACE_TONE[v.place];
              return (
                <section key={v.place} data-drop={v.place} aria-labelledby={`q-${v.place}`} class={`min-h-40 rounded-2xl p-3 ${tone.tint} ${ring(v.place)}`}>
                  <header class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h3 id={`q-${v.place}`} class={`flex items-center gap-2 font-semibold ${tone.text}`}>
                        <span class={`rounded-md px-1.5 py-px text-[11px] font-bold ${tone.badge}`}>{label.badge}</span>
                        {label.name}
                      </h3>
                      <p class="mt-0.5 text-xs text-muted">{label.hint}</p>
                    </div>
                    <span class="pt-0.5 text-xs text-muted tabular-nums" aria-label={`${v.open} open, ${v.points} story points`}>
                      {v.open}
                    </span>
                  </header>
                  <ul class="mt-2 grid gap-1.5">{v.tasks.map((n) => row(n))}</ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      {drag && (
        <div
          aria-hidden="true"
          style={{ left: `${drag.x}px`, top: `${drag.y}px` }}
          class="pointer-events-none fixed z-50 max-w-64 -translate-x-1/2 -translate-y-1/2 truncate rounded-xl bg-surface-highest px-4 py-3 text-sm shadow-xl outline-2 outline-primary"
        >
          {drag.note.text}
        </div>
      )}
    </section>
  );
}
