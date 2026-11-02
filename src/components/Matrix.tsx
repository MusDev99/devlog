import { useEffect, useState } from 'preact/hooks';
import type { QuadrantView } from '../lib/matrix.ts';
import { formatDuration, QUADRANT_LABELS, QUADRANTS, quadrantOf, type Note, type Quadrant } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';
import { QUADRANT_TONE, TaskCard, type TaskActions } from './TaskCard.tsx';

export type DropTarget = Quadrant | 'done';

type Props = TaskActions & {
  views: QuadrantView[];
  done: { recent: Note[]; earlier: Note[] };
  today: string;
  nowMs: number;
  active: Quadrant;
  onSelect: (quadrant: Quadrant) => void;
  onDrop: (note: Note, target: DropTarget) => void;
};

type Drag = { note: Note; x: number; y: number; over: DropTarget | null };

const EMPTY: Record<Quadrant, string> = {
  do: 'Nothing urgent and important right now.',
  schedule: 'Plan important work here before it turns urgent.',
  delegate: 'Urgent but not yours: hand these off.',
  eliminate: 'Low value. Drop or park these.',
};

/** The drop target under a point: any element marked `data-drop` (quadrants, the phone selector, Done). */
function targetAt(x: number, y: number): DropTarget | null {
  const value = document.elementFromPoint(x, y)?.closest('[data-drop]')?.getAttribute('data-drop');
  return value === 'done' || QUADRANTS.includes(value as Quadrant) ? (value as DropTarget) : null;
}

const points = (n: number) => `${n} ${n === 1 ? 'pt' : 'pts'}`;

/**
 * Eisenhower matrix. Phone: a 2×2 selector with counts, one quadrant listed below (Hick).
 * Wider screens: the full 2×2 grid. Tasks drag by their handle with mouse or touch (pointer events);
 * every drag also has a menu equivalent.
 */
export function Matrix({ views, done, today, nowMs, active, onSelect, onDrop, ...actions }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragId = drag?.note.id;

  useEffect(() => {
    if (!drag) return;
    const note = drag.note;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      // Edge scroll so a phone can reach the selector at the top.
      if (e.clientY < 72) window.scrollBy(0, -12);
      else if (e.clientY > window.innerHeight - 72) window.scrollBy(0, 12);
      setDrag((d) => d && { ...d, x: e.clientX, y: e.clientY, over: targetAt(e.clientX, e.clientY) });
    };
    const up = (e: PointerEvent) => {
      const over = targetAt(e.clientX, e.clientY);
      setDrag(null);
      if (over && over !== quadrantOf(note)) onDrop(note, over);
    };
    const cancel = () => setDrag(null);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && cancel();
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
    };
    // Re-bind only when a different task starts dragging; position updates go through setDrag.
  }, [dragId]);

  const startDrag = (note: Note, e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDrag({ note, x: e.clientX, y: e.clientY, over: null });
  };
  const ring = (target: DropTarget) => (drag && drag.over === target ? 'outline-2 outline-dashed outline-primary' : '');
  const card = (note: Note) => <TaskCard key={note.id} note={note} today={today} nowMs={nowMs} onDragStart={startDrag} {...actions} />;
  const doneCount = done.recent.length + done.earlier.length;

  return (
    <div class={drag ? 'select-none' : ''}>
      {/* Phone: 2×2 selector doubling as drop targets. */}
      <div class="md:hidden">
        <div class="grid grid-cols-2 gap-1 px-1 pb-1 text-center text-xs font-medium tracking-wide text-muted">
          <span>Urgent</span>
          <span>Not urgent</span>
        </div>
        <div role="tablist" aria-label="Quadrants" class="grid grid-cols-2 gap-1.5">
          {views.map((v) => (
            <button
              key={v.quadrant}
              type="button"
              role="tab"
              data-drop={v.quadrant}
              aria-selected={active === v.quadrant}
              aria-controls={`quad-${v.quadrant}`}
              onClick={() => onSelect(v.quadrant)}
              class={`state-layer flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-2xl px-3 py-2 text-left ${
                active === v.quadrant ? 'bg-primary-container text-on-primary-container' : 'bg-surface'
              } ${ring(v.quadrant)}`}
            >
              <span class="flex items-center gap-1.5 text-sm font-medium">
                <Icon name={v.quadrant} class={`size-[18px] ${active === v.quadrant ? '' : QUADRANT_TONE[v.quadrant]}`} />
                {QUADRANT_LABELS[v.quadrant].name}
              </span>
              <span class={`text-xs ${active === v.quadrant ? '' : 'text-muted'}`}>
                {v.tasks.length} · {points(v.points)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wide: axis labels over the full grid. */}
      <div class="hidden grid-cols-2 gap-3 pb-2 text-center text-xs font-medium tracking-wide text-muted md:grid">
        <span>Urgent</span>
        <span>Not urgent</span>
      </div>
      <div class="mt-3 grid gap-3 md:mt-0 md:grid-cols-2">
        {views.map((v) => (
          <section
            key={v.quadrant}
            id={`quad-${v.quadrant}`}
            data-drop={v.quadrant}
            aria-labelledby={`quad-title-${v.quadrant}`}
            class={`${active === v.quadrant ? 'flex' : 'hidden'} min-h-40 flex-col gap-2 rounded-3xl bg-surface p-2 md:flex ${ring(v.quadrant)}`}
          >
            <header class="flex items-start justify-between gap-2 px-2 pt-2">
              <div class="min-w-0">
                <h2 id={`quad-title-${v.quadrant}`} class="flex items-center gap-2 text-lg leading-6">
                  <Icon name={v.quadrant} class={`size-5 ${QUADRANT_TONE[v.quadrant]}`} />
                  {QUADRANT_LABELS[v.quadrant].name}
                </h2>
                <p class="mt-0.5 text-xs text-muted">{QUADRANT_LABELS[v.quadrant].hint}</p>
              </div>
              <p class="shrink-0 pt-0.5 text-right text-xs text-muted tabular-nums">
                {v.tasks.length} · {points(v.points)}
                {v.trackedMs > 0 && (
                  <>
                    <br />
                    {formatDuration(v.trackedMs, false)}
                  </>
                )}
              </p>
            </header>
            {v.tasks.length === 0 && <p class="px-2 pb-3 text-sm leading-5 text-muted">{EMPTY[v.quadrant]}</p>}
            <ul class="grid gap-2">{v.tasks.map(card)}</ul>
          </section>
        ))}
      </div>

      <details data-drop="done" class={`group mt-3 rounded-3xl bg-surface p-2 ${ring('done')}`}>
        <summary class="state-layer flex min-h-11 cursor-pointer list-none items-center justify-between rounded-full px-3 font-medium [&::-webkit-details-marker]:hidden">
          <span class="flex items-center gap-2">
            <Icon name="done" class="size-5 text-ok" />
            Done · {doneCount}
          </span>
          <Icon name="expand" class="size-6 text-muted transition-transform duration-200 group-open:rotate-180" />
        </summary>
        {doneCount === 0 && <p class="px-3 py-2 text-sm text-muted">Finished tasks land here. Drop a task here to finish it.</p>}
        <ul class="mt-2 grid gap-2">{done.recent.map(card)}</ul>
        {done.earlier.length > 0 && (
          <details class="group/earlier mt-2">
            <summary class="state-layer flex min-h-11 cursor-pointer list-none items-center justify-between rounded-full px-3 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
              Earlier · {done.earlier.length}
              <Icon name="expand" class="size-6 transition-transform duration-200 group-open/earlier:rotate-180" />
            </summary>
            <ul class="mt-2 grid gap-2">{done.earlier.map(card)}</ul>
          </details>
        )}
      </details>

      {drag && (
        <div
          aria-hidden="true"
          style={{ left: `${drag.x}px`, top: `${drag.y}px` }}
          class="pointer-events-none fixed z-50 max-w-64 -translate-x-1/2 -translate-y-1/2 truncate rounded-2xl bg-surface-highest px-4 py-3 text-sm shadow-xl outline-2 outline-primary"
        >
          {drag.note.text}
        </div>
      )}
    </div>
  );
}
