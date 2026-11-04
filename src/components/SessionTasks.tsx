import { useEffect, useRef, useState } from 'preact/hooks';
import { loadPref, savePref } from '../lib/db.ts';
import { buzz } from '../lib/haptics.ts';
import { plainText } from '../lib/links.ts';
import { doneBucket, listView, places, progressCount } from '../lib/matrix.ts';
import { PLACES, placeOf, QUADRANT_LABELS, type Draft, type Note, type Place, type Size } from '../lib/notes.ts';
import { Composer } from './Composer.tsx';
import { DoneBucket } from './DoneBucket.tsx';
import { Icon } from './Icon.tsx';
import { PLACE_TONE, TaskRow, type RowActions } from './TaskRow.tsx';

type Props = RowActions & {
  tasks: Note[];
  today: string;
  nowMs: number;
  focusId: string | null;
  onAdd: (draft: Draft, size: Size, focus: boolean) => Promise<void>;
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

const savedView = (): View => (loadPref(VIEW_KEY) === 'list' ? 'list' : 'matrix');

/**
 * Session Tasks: add row, List / Matrix switch, Unsorted strip and the four quadrants.
 * Drag a row with the mouse, or long-press then drag on touch (a plain swipe still scrolls);
 * the row menu moves it without dragging.
 */
export function SessionTasks({ tasks, today, nowMs, focusId, onAdd, ...actions }: Props) {
  const [view, setView] = useState<View>(savedView);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pending = useRef<Pending | null>(null);
  const suppressClick = useRef(false);
  // Listeners bind once; the latest handler is read at drop time.
  const onPlace = useRef(actions.onPlace);
  onPlace.current = actions.onPlace;
  const onFinish = useRef((note: Note) => actions.onStatus(note, 'done'));
  onFinish.current = (note: Note) => actions.onStatus(note, 'done');
  const { done, total } = progressCount(tasks, today);

  const begin = (p: Pending, x: number, y: number) => {
    const d = { note: p.note, x, y, over: placeAt(x, y) };
    dragRef.current = d;
    setDrag(d);
    if (p.touch) buzz('grab');
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
      if (over === 'done') onFinish.current(d.note);
      else if (over && over !== placeOf(d.note)) onPlace.current(d.note, over);
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
    if ((e.target as Element).closest('button:not([data-row-main]), select, input, a')) return;
    const p: Pending = { note, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
    if (p.touch) p.timer = setTimeout(() => pending.current === p && (clearPending(), begin(p, p.x, p.y)), LONG_PRESS_MS);
    pending.current = p;
  }

  const rowActions: RowActions = { ...actions, onSelect: (note) => !suppressClick.current && actions.onSelect(note) };
  const row = (note: Note, showPlace = false) => (
    <TaskRow key={note.id} note={note} nowMs={nowMs} focused={note.id === focusId} showPlace={showPlace} onPointerDown={rowPointerDown} {...rowActions} />
  );
  // Drop zones light up in their own colour while a task hovers them.
  const ring = (place: Place) =>
    drag?.over === place && drag.over !== placeOf(drag.note) ? `outline-2 outline-dashed outline-offset-2 ${PLACE_TONE[place].ring}` : '';
  const doneRing = drag?.over === 'done' ? 'outline-2 outline-dashed outline-offset-2 outline-ok' : '';
  const switchView = (v: View) => {
    setView(v);
    savePref(VIEW_KEY, v);
  };

  const views = places(tasks);
  const unsorted = views[0];
  const list = view === 'list' ? listView(tasks) : null;
  const finished = doneBucket(tasks, today);

  return (
    <section aria-labelledby="tasks-title" class={drag ? 'select-none' : ''}>
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <h2 id="tasks-title" class="text-lg font-semibold">
              Tasks
            </h2>
            <span class="text-sm text-muted tabular-nums" aria-label={`${done} of ${total} done`}>
              {done}/{total}
            </span>
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
              return (
                <section
                  key={v.place}
                  data-drop={v.place}
                  aria-labelledby={`q-${v.place}`}
                  class={`flex min-h-40 flex-col rounded-2xl p-2.5 transition-[outline-color] md:min-h-56 lg:min-h-[clamp(14rem,30vh,22rem)] ${tone.tint} ${ring(v.place)}`}
                >
                  <header class="flex items-center justify-between gap-2 px-1.5 pt-0.5 pb-2" title={label.hint}>
                    <h3 id={`q-${v.place}`} class="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <span aria-hidden="true" class={`size-2 shrink-0 rounded-full ${tone.dot}`} />
                      <span class={tone.text}>{label.name}</span>
                      <span class="truncate text-xs font-normal text-muted">
                        {label.badge}
                        <span class="hidden sm:inline"> · {label.hint}</span>
                      </span>
                    </h3>
                    <span class="shrink-0 text-xs text-muted tabular-nums" aria-label={`${v.open} open, ${v.points} story points`}>
                      {v.open > 0 ? `${v.open} · ${v.points} SP` : ''}
                    </span>
                  </header>
                  {v.tasks.length === 0 ? (
                    <p class="grid flex-1 place-items-center rounded-xl border border-dashed border-line/70 px-3 py-4 text-center text-xs text-muted">Drag a task here</p>
                  ) : (
                    <ul class="grid gap-1.5">{v.tasks.map((n) => row(n))}</ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <DoneBucket
        recent={finished.recent}
        earlier={finished.earlier}
        today={today}
        nowMs={nowMs}
        dropRing={doneRing}
        dragging={drag !== null}
        onRestore={(note) => actions.onStatus(note, 'todo')}
        onDelete={actions.onDelete}
      />

      {drag && (
        <div
          aria-hidden="true"
          style={{ left: `${drag.x}px`, top: `${drag.y}px` }}
          class="pointer-events-none fixed z-50 max-w-64 -translate-x-1/2 -translate-y-1/2 rotate-2 truncate rounded-xl bg-surface-highest px-4 py-3 text-sm font-medium shadow-2xl ring-2 ring-accent"
        >
          {plainText(drag.note.text)}
        </div>
      )}
    </section>
  );
}
