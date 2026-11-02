import { useState } from 'preact/hooks';
import { PLACES, placeOf, QUADRANT_LABELS, SIZES, sizeOf, TAG_LABELS, type Note, type Place, type Size, type Tag } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';

export type RowActions = {
  onSelect: (note: Note) => void;
  onStatus: (note: Note, tag: Tag) => void;
  onPlace: (note: Note, place: Place) => void;
  onSize: (note: Note, size: Size) => void;
  onDelete: (note: Note) => void;
};

type Props = RowActions & {
  note: Note;
  focused: boolean;
  /** List view shows where the task sits. */
  showPlace?: boolean;
  onPointerDown?: (note: Note, e: PointerEvent) => void;
};

export const PLACE_NAMES: Record<Place, string> = {
  unsorted: 'Unsorted',
  do: QUADRANT_LABELS.do.name,
  schedule: QUADRANT_LABELS.schedule.name,
  delegate: QUADRANT_LABELS.delegate.name,
  eliminate: QUADRANT_LABELS.eliminate.name,
};

/** Quadrant tone: text colour, badge fill, panel tint. Always paired with a Q badge and a name. */
export const PLACE_TONE: Record<Place, { text: string; badge: string; tint: string }> = {
  unsorted: { text: 'text-muted', badge: 'bg-outline text-bg', tint: '' },
  do: { text: 'text-error', badge: 'bg-error text-bg', tint: 'bg-error/12' },
  schedule: { text: 'text-ok', badge: 'bg-ok text-bg', tint: 'bg-ok/12' },
  delegate: { text: 'text-warn', badge: 'bg-warn text-bg', tint: 'bg-warn/12' },
  eliminate: { text: 'text-muted', badge: 'bg-outline text-bg', tint: 'bg-outline/12' },
};

const STATUS_TONE: Partial<Record<Tag, string>> = { doing: 'text-warn', blocker: 'text-error' };

/** Compact task row: done toggle, the task (tap to focus on it, drag to move), and a menu for everything else. */
export function TaskRow({ note, focused, showPlace, onPointerDown, onSelect, onStatus, onPlace, onSize, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const done = note.tag === 'done';
  const size = sizeOf(note);
  const place = placeOf(note);
  const chip = 'state-layer inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-outline px-3 text-sm font-medium';

  return (
    <li
      onPointerDown={onPointerDown && ((e) => onPointerDown(note, e))}
      onContextMenu={onPointerDown && ((e) => e.preventDefault())}
      class={`rounded-xl border bg-bg/45 select-none [-webkit-touch-callout:none] ${focused ? 'border-primary shadow-[0_0_0_1px_var(--color-primary)]' : 'border-transparent'}`}
    >
      <div class="flex items-center gap-0.5 pr-0.5 pl-1">
        <button
          type="button"
          onClick={() => onStatus(note, done ? 'todo' : 'done')}
          aria-pressed={done}
          aria-label={done ? `Reopen: ${note.text}` : `Mark done: ${note.text}`}
          class="state-layer grid size-11 shrink-0 place-items-center rounded-full"
        >
          {done ? (
            <span class="grid size-5 place-items-center rounded-full bg-primary text-on-primary">
              <Icon name="check" class="size-3.5" />
            </span>
          ) : (
            <span class="size-5 rounded-full border-2 border-outline" />
          )}
        </button>
        <button
          type="button"
          data-row-main
          onClick={() => !done && onSelect(note)}
          aria-pressed={done ? undefined : focused}
          aria-label={done ? note.text : `${focused ? 'Focusing on' : 'Focus on'}: ${note.text}`}
          class={`min-h-11 min-w-0 flex-1 py-2 text-left ${done ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <span class={`block leading-5 break-words ${done ? 'text-muted line-through' : ''}`}>{note.text}</span>
          <span class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            {(note.pomodoros ?? 0) > 0 && (
              <span aria-label={`${note.pomodoros} pomodoros`}>
                {note.pomodoros}
                <span aria-hidden="true">🍅</span>
              </span>
            )}
            <span>{size} SP</span>
            {STATUS_TONE[note.tag] && <span class={STATUS_TONE[note.tag]}>{TAG_LABELS[note.tag]}</span>}
            {showPlace && <span class={PLACE_TONE[place].text}>{place === 'unsorted' ? 'Unsorted' : QUADRANT_LABELS[place].badge}</span>}
          </span>
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

      {open && (
        <div class="grid gap-2 border-t border-line px-3 py-2">
          <p class="text-xs font-medium tracking-wide text-muted">Move to</p>
          <div class="flex flex-wrap gap-2">
            {PLACES.filter((p) => p !== place).map((p) => (
              <button key={p} type="button" onClick={() => onPlace(note, p)} class={chip}>
                {p !== 'unsorted' && <span class={`rounded px-1 text-[10px] font-bold ${PLACE_TONE[p].badge}`}>{QUADRANT_LABELS[p].badge}</span>}
                {PLACE_NAMES[p]}
              </button>
            ))}
          </div>
          <p class="text-xs font-medium tracking-wide text-muted">Size</p>
          <div class="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === size}
                onClick={() => onSize(note, s)}
                class={`${chip} ${s === size ? 'border-primary bg-primary-container text-on-primary-container' : ''}`}
              >
                {s} SP
              </button>
            ))}
          </div>
          <p class="text-xs font-medium tracking-wide text-muted">Status</p>
          <div class="flex flex-wrap gap-2">
            {(['todo', 'doing', 'blocker'] as const)
              .filter((t) => t !== note.tag)
              .map((t) => (
                <button key={t} type="button" onClick={() => onStatus(note, t)} class={chip}>
                  {TAG_LABELS[t]}
                </button>
              ))}
            <button type="button" onClick={() => onDelete(note)} aria-label={`Delete task: ${note.text}`} class={`${chip} border-transparent text-error`}>
              <Icon name="delete" class="size-[18px]" />
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
