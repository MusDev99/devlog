import { useState } from 'preact/hooks';
import { shortDay } from '../lib/matrix.ts';
import {
  elapsedMs,
  formatDuration,
  QUADRANT_LABELS,
  QUADRANTS,
  quadrantOf,
  SIZE_LABELS,
  sizeOf,
  TAG_LABELS,
  TAGS,
  type Note,
  type Quadrant,
  type Tag,
} from '../lib/notes.ts';
import { Icon } from './Icon.tsx';

export type TaskActions = {
  onStatus: (note: Note, tag: Tag) => void;
  onQuadrant: (note: Note, quadrant: Quadrant) => void;
  onSize: (note: Note) => void;
  onTimer: (note: Note) => void;
  onDelete: (note: Note) => void;
};

type Props = TaskActions & {
  note: Note;
  today: string;
  nowMs: number;
  onDragStart: (note: Note, e: PointerEvent) => void;
};

/** Quadrant tones, shared with the matrix headers. Always paired with an icon and a name. */
export const QUADRANT_TONE: Record<Quadrant, string> = {
  do: 'text-error',
  schedule: 'text-ok',
  delegate: 'text-warn',
  eliminate: 'text-muted',
};

const STATUS_TONE: Record<Tag, string> = { todo: 'text-muted', doing: 'text-warn', blocker: 'text-error', done: 'text-ok' };

/** One task: drag handle, done toggle, size, timer, and a menu for status, quadrant or delete. */
export function TaskCard({ note, today, nowMs, onDragStart, onStatus, onQuadrant, onSize, onTimer, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const running = Boolean(note.startedAt);
  const done = note.tag === 'done';
  const size = sizeOf(note);
  const spent = elapsedMs(note, nowMs);
  const chip = 'state-layer inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium';

  return (
    <li class={`rounded-2xl bg-surface-high ${running ? 'outline-2 outline-primary' : ''}`}>
      <div class="flex items-start gap-0.5 py-1 pr-1">
        {!done && (
          <span
            role="presentation"
            title="Drag to another quadrant"
            onPointerDown={(e) => onDragStart(note, e)}
            class="grid size-11 shrink-0 cursor-grab touch-none place-items-center text-muted select-none"
          >
            <Icon name="drag" class="size-5" />
          </span>
        )}
        <div class={`min-w-0 flex-1 py-2 ${done ? 'pl-4' : ''}`}>
          <p class={`leading-6 break-words ${done ? 'text-muted line-through' : ''}`}>{note.text}</p>
          <p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            <span class={STATUS_TONE[note.tag]}>{TAG_LABELS[note.tag]}</span>·<span>{shortDay(note.day, today)}</span>
            {done && (
              <>
                ·<span>{QUADRANT_LABELS[quadrantOf(note)].name}</span>·<span>{SIZE_LABELS[size]}</span>
                {spent > 0 && (
                  <>
                    ·<span class="tabular-nums">{formatDuration(spent, false)}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onStatus(note, done ? 'todo' : 'done')}
          aria-pressed={done}
          aria-label={done ? `Reopen: ${note.text}` : `Mark done: ${note.text}`}
          title={done ? 'Reopen' : 'Mark done'}
          class={`state-layer grid size-11 shrink-0 place-items-center rounded-full ${done ? 'text-ok' : 'text-muted'}`}
        >
          <Icon name={done ? 'done' : 'todo'} class="size-6" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`More actions: ${note.text}`}
          class="state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-fg"
        >
          <Icon name="more" class="size-5" />
        </button>
      </div>

      {!done && (
        <div class="flex flex-wrap items-center gap-2 px-2 pb-2">
          <button
            type="button"
            onClick={() => onSize(note)}
            aria-label={`Size ${SIZE_LABELS[size]}, ${size} ${size === 1 ? 'point' : 'points'}. Change size: ${note.text}`}
            title="T-shirt size: S 1 · M 3 · L 5"
            class={`${chip} border border-outline`}
          >
            <span class="text-base leading-none">{SIZE_LABELS[size]}</span>
            <span class="text-muted">· {size}</span>
          </button>
          <button
            type="button"
            onClick={() => onTimer(note)}
            aria-pressed={running}
            aria-label={`${running ? 'Stop' : 'Start'} timer, ${formatDuration(spent, false)} so far: ${note.text}`}
            class={`${chip} tabular-nums ${running ? 'bg-primary text-on-primary' : 'bg-primary-container text-on-primary-container'}`}
          >
            <Icon name={running ? 'stop' : 'play'} class="size-[18px]" />
            {running ? formatDuration(spent, true) : spent > 0 ? formatDuration(spent, false) : 'Start'}
          </button>
        </div>
      )}

      {open && (
        <div class="grid gap-2 border-t border-line px-3 py-2">
          <p class="text-xs font-medium tracking-wide text-muted">Status</p>
          <div class="flex flex-wrap gap-2">
            {TAGS.filter((t) => t !== note.tag).map((t) => (
              <button key={t} type="button" onClick={() => onStatus(note, t)} class={`${chip} border border-outline`}>
                <Icon name={t} class={`size-[18px] ${STATUS_TONE[t]}`} />
                {TAG_LABELS[t]}
              </button>
            ))}
          </div>
          <p class="text-xs font-medium tracking-wide text-muted">Quadrant</p>
          <div class="flex flex-wrap gap-2">
            {QUADRANTS.filter((q) => q !== quadrantOf(note)).map((q) => (
              <button key={q} type="button" onClick={() => onQuadrant(note, q)} class={`${chip} border border-outline`}>
                <Icon name={q} class={`size-[18px] ${QUADRANT_TONE[q]}`} />
                {QUADRANT_LABELS[q].name}
              </button>
            ))}
          </div>
          <div>
            <button type="button" onClick={() => onDelete(note)} aria-label={`Delete task: ${note.text}`} class={`${chip} text-error`}>
              <Icon name="delete" class="size-[18px]" />
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
