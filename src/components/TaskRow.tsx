import { memo } from 'preact/compat';
import { useState } from 'preact/hooks';
import { elapsedMs, formatClock, formatDuration, PLACES, placeOf, QUADRANT_LABELS, SIZES, sizeOf, TAG_LABELS, type Note, type Place, type Size, type Tag } from '../lib/notes.ts';
import { linksIn, titleText } from '../lib/links.ts';
import { taskTiming } from '../lib/timing.ts';
import { useClock } from '../lib/use-clock.ts';
import { Icon } from './Icon.tsx';

export type RowActions = {
  onSelect: (note: Note) => void;
  /** Start, pause or resume this task's stopwatch (it also becomes the selected task). */
  onTimer: (note: Note) => void;
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

/** Quadrant tone: text, dot, panel tint and drop ring. Always paired with a name and a Q badge. */
export const PLACE_TONE: Record<Place, { text: string; dot: string; tint: string; ring: string }> = {
  unsorted: { text: 'text-muted', dot: 'bg-outline', tint: 'bg-surface-low', ring: 'outline-outline' },
  do: { text: 'text-error', dot: 'bg-error', tint: 'bg-error/[0.07]', ring: 'outline-error' },
  schedule: { text: 'text-ok', dot: 'bg-ok', tint: 'bg-ok/[0.07]', ring: 'outline-ok' },
  delegate: { text: 'text-warn', dot: 'bg-warn', tint: 'bg-warn/[0.07]', ring: 'outline-warn' },
  eliminate: { text: 'text-muted', dot: 'bg-outline', tint: 'bg-outline/[0.08]', ring: 'outline-outline' },
};

const STATUS_TONE: Partial<Record<Tag, string>> = { doing: 'bg-warn/15 text-warn', blocker: 'bg-error/15 text-error' };

/** On a mouse, secondary row actions wait for hover (Hick); on touch they stay visible. */
const REVEAL = '[@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity';

/** Compact task row: tick, the task (tap to select, drag to move), its own Start/Stop, and a menu for the rest. */
function TaskRowView({ note, focused, showPlace, onPointerDown, onSelect, onTimer, onStatus, onPlace, onSize, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const done = note.tag === 'done';
  const size = sizeOf(note);
  const place = placeOf(note);
  const running = Boolean(note.startedAt);
  // Only a running row subscribes to the clock; every other row is untouched by a tick.
  const nowMs = useClock(running);
  const title = titleText(note.text);
  const links = linksIn(note.text);
  const spent = elapsedMs(note, nowMs);
  const logged = spent < 60_000 ? `${Math.floor(spent / 1000)}s` : formatDuration(spent, false);
  const timing = done ? taskTiming(note, nowMs) : null;
  const span = timing?.start && timing.pausedMs >= 60_000 ? formatDuration(timing.spanMs, false) : null;
  // Only a task just added slides in; rows that re-mount (tab switch, move) appear calmly.
  const fresh = Date.now() - Date.parse(note.createdAt) < 1500;
  const chipBase = 'press state-layer inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium';
  const chip = `${chipBase} bg-surface-highest/60`;

  return (
    <li
      onPointerDown={onPointerDown && ((e) => onPointerDown(note, e))}
      onContextMenu={onPointerDown && ((e) => e.preventDefault())}
      class={`group rounded-xl transition-colors select-none [-webkit-touch-callout:none] [contain-intrinsic-size:auto_56px] [content-visibility:auto] ${
        fresh ? 'animate-rise' : ''
      } ${
        focused ? 'bg-accent/10 shadow-[inset_3px_0_0_var(--color-accent)]' : 'bg-surface-high/80 hover:bg-surface-highest/80'
      }`}
    >
      <div class="flex items-center gap-0.5 pr-0.5 pl-1">
        <button
          type="button"
          onClick={() => onStatus(note, done ? 'todo' : 'done')}
          aria-pressed={done}
          aria-label={done ? `Reopen: ${title}` : `Mark done: ${title}`}
          class="press grid size-11 shrink-0 place-items-center rounded-full"
        >
          {done ? (
            <span class="grid size-5 animate-pop place-items-center rounded-full bg-ok text-bg">
              <Icon name="check" class="size-3.5" />
            </span>
          ) : (
            <span class="size-5 rounded-full border-2 border-outline transition-colors group-hover:border-fg/70" />
          )}
        </button>
        <div class="min-w-0 flex-1">
        <button
          type="button"
          data-row-main
          onClick={() => !done && onSelect(note)}
          aria-pressed={done ? undefined : focused}
          aria-label={done ? title : `${focused ? 'Selected' : 'Select'}: ${title}`}
          class={`block min-h-11 w-full py-2 text-left ${done ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <span class={`block text-[15px] leading-5 break-words ${done ? 'text-muted line-through decoration-outline' : ''}`}>{title}</span>
          {(spent > 0 || STATUS_TONE[note.tag] || showPlace) && (
            <span class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {spent > 0 && (
                <span class={`tabular-nums ${running ? 'font-semibold text-accent' : ''}`} aria-label={`${logged} actual`}>
                  {running ? formatClock(spent) : logged}
                </span>
              )}
              {/* Finished: actual vs span, so pauses are visible at a glance. */}
              {done && span && <span class="tabular-nums">· span {span}</span>}
              {STATUS_TONE[note.tag] && <span class={`rounded-md px-1.5 py-px font-medium ${STATUS_TONE[note.tag]}`}>{TAG_LABELS[note.tag]}</span>}
              {showPlace && (
                <span class={`inline-flex items-center gap-1 ${PLACE_TONE[place].text}`}>
                  <span aria-hidden="true" class={`size-1.5 rounded-full ${PLACE_TONE[place].dot}`} />
                  {PLACE_NAMES[place]}
                </span>
              )}
            </span>
          )}
        </button>
        {/* Links stay real links (outside the select button): Jira shows its key, others a short name. */}
        {links.length > 0 && (
          // 28px chip inside a 44px tap target (Fitts); negative margins keep the row compact.
          <span class="-mt-3 -mb-1.5 flex flex-wrap gap-x-1.5">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                title={l.href}
                onClick={(e) => e.stopPropagation()}
                class="press group/link inline-flex min-h-11 max-w-full items-center"
              >
                <span class="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-google-blue/15 px-2 text-xs font-semibold text-google-blue transition-colors group-hover/link:bg-google-blue/25">
                  <span class="truncate">{l.label}</span>
                  <Icon name="open" class="size-3.5 shrink-0" />
                </span>
              </a>
            ))}
          </span>
        )}
        </div>
        <span title={`${size} story ${size === 1 ? 'point' : 'points'}`} class="shrink-0 rounded-md bg-surface-highest px-1.5 py-0.5 text-[11px] font-semibold text-muted tabular-nums">
          {size}
        </span>
        {!done && (
          <button
            type="button"
            onClick={() => onTimer(note)}
            aria-pressed={running}
            aria-label={`${running ? 'Pause' : spent > 0 ? 'Resume' : 'Start'} timer: ${title}`}
            title={running ? 'Pause' : spent > 0 ? 'Resume' : 'Start'}
            class={`press state-layer grid size-11 shrink-0 place-items-center rounded-full ${running ? 'bg-accent text-on-accent' : 'text-accent'}`}
          >
            <Icon name={running ? 'pause' : 'play'} class="size-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`More actions: ${title}`}
          class={`press state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-fg ${open ? '' : REVEAL}`}
        >
          <Icon name="more" class="size-5" />
        </button>
      </div>

      {open && (
        <div class="grid animate-rise gap-2.5 border-t border-line/70 px-3 pt-2.5 pb-3">
          <p class="text-[11px] font-semibold tracking-wider text-muted uppercase">Move to</p>
          <div class="flex flex-wrap gap-2">
            {PLACES.filter((p) => p !== place).map((p) => (
              <button key={p} type="button" onClick={() => onPlace(note, p)} class={chip}>
                <span aria-hidden="true" class={`size-2 rounded-full ${PLACE_TONE[p].dot}`} />
                {PLACE_NAMES[p]}
              </button>
            ))}
          </div>
          <div class="flex flex-wrap items-end gap-x-6 gap-y-2.5">
            <div class="w-full">
              <p class="text-[11px] font-semibold tracking-wider text-muted uppercase">Story points</p>
              {/* Fibonacci 1–21: seven targets wrap on a phone rather than run off the edge. */}
              <div class="mt-2 flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={s === size}
                    aria-label={`${s} story points`}
                    onClick={() => onSize(note, s)}
                    class={`${chipBase} min-w-11 justify-center tabular-nums ${s === size ? 'bg-accent font-semibold text-on-accent' : 'bg-surface-highest/60'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p class="text-[11px] font-semibold tracking-wider text-muted uppercase">Status</p>
              <div class="mt-2 flex flex-wrap gap-2">
                {(['todo', 'doing', 'blocker'] as const)
                  .filter((t) => t !== note.tag)
                  .map((t) => (
                    <button key={t} type="button" onClick={() => onStatus(note, t)} class={chip}>
                      {TAG_LABELS[t]}
                    </button>
                  ))}
              </div>
            </div>
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              onClick={() => onDelete(note)}
              aria-label={`Delete task: ${title}`}
              class="press state-layer inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-error"
            >
              <Icon name="delete" class="size-[18px]" />
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Memoised: a row re-renders only when its own task, focus or place label changes (handlers are stable). */
export const TaskRow = memo(TaskRowView);
