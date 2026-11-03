import { useState } from 'preact/hooks';
import { linksIn, titleText } from '../lib/links.ts';
import { formatDuration, placeOf, sizeOf, type Note } from '../lib/notes.ts';
import { taskTiming } from '../lib/timing.ts';
import { Icon } from './Icon.tsx';
import { PLACE_NAMES, PLACE_TONE } from './TaskRow.tsx';

type Props = {
  recent: Note[];
  earlier: Note[];
  today: string;
  nowMs: number;
  /** Outline shown while a dragged task hovers the bucket. */
  dropRing: string;
  dragging: boolean;
  onRestore: (note: Note) => void;
  onDelete: (note: Note) => void;
};

const DAY_MS = 86_400_000;
function when(day: string, today: string): string {
  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.parse(`${day}T00:00:00Z`));
}

/**
 * Finished tasks leave their quadrant and land here (Zeigarnik: the matrix shows only what is still open).
 * Restore sends a task back to its quadrant as To do. Dropping a task here finishes it.
 */
export function DoneBucket({ recent, earlier, today, nowMs, dropRing, dragging, onRestore, onDelete }: Props) {
  const [open, setOpen] = useState(true);
  const total = recent.length + earlier.length;
  const row = (note: Note) => <DoneRow key={note.id} note={note} today={today} nowMs={nowMs} onRestore={onRestore} onDelete={onDelete} />;

  return (
    <section data-drop="done" aria-labelledby="done-title" class={`mt-5 rounded-2xl border border-line/60 bg-surface-low/80 p-2.5 transition-[outline-color] ${dropRing}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        class="state-layer flex min-h-11 w-full items-center gap-2 rounded-xl px-1.5 text-left"
      >
        <Icon name="done" class="size-5 text-ok" />
        <h3 id="done-title" class="text-sm font-semibold">
          Done
        </h3>
        <span class="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-ok tabular-nums">{total}</span>
        <span class="ml-auto text-xs text-muted">{dragging ? 'Drop here to finish' : recent.length > 0 ? 'Restore to send a task back' : ''}</span>
        <Icon name="expand" class={`size-6 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div class="mt-1">
          {total === 0 && <p class="px-1.5 pt-1 pb-2 text-xs text-muted">Finished tasks land here. Tick a task, or drag it here.</p>}
          <ul class="grid gap-1.5">{recent.map(row)}</ul>
          {earlier.length > 0 && (
            <details class="group mt-2">
              <summary class="state-layer flex min-h-11 cursor-pointer list-none items-center justify-between rounded-full px-3 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
                Earlier · {earlier.length}
                <Icon name="expand" class="size-6 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <ul class="mt-2 grid gap-1.5">{earlier.map(row)}</ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function DoneRow({ note, today, nowMs, onRestore, onDelete }: { note: Note; today: string; nowMs: number; onRestore: (n: Note) => void; onDelete: (n: Note) => void }) {
  const title = titleText(note.text);
  const links = linksIn(note.text);
  const place = placeOf(note);
  const t = taskTiming(note, nowMs);
  return (
    <li class="flex animate-rise items-center gap-2 rounded-xl bg-surface-high/60 py-1 pr-1 pl-3">
      <span class="grid size-5 shrink-0 place-items-center rounded-full bg-ok text-bg">
        <Icon name="check" class="size-3.5" />
      </span>
      <div class="min-w-0 flex-1 py-1.5">
        <p class="text-sm leading-5 break-words text-muted line-through decoration-outline">{title}</p>
        <p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
          <span class={`inline-flex items-center gap-1 ${PLACE_TONE[place].text}`}>
            <span aria-hidden="true" class={`size-1.5 rounded-full ${PLACE_TONE[place].dot}`} />
            {PLACE_NAMES[place]}
          </span>
          <span>· {sizeOf(note)} SP</span>
          {t && t.actualMs >= 60_000 && (
            <span class="tabular-nums">
              · {formatDuration(t.actualMs, false)}
              {t.start && t.pausedMs >= 60_000 && ` (span ${formatDuration(t.spanMs, false)})`}
            </span>
          )}
          <span>· {when(note.day, today)}</span>
          {links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" title={l.href} class="inline-flex min-h-11 items-center font-semibold text-google-blue hover:underline">
              · {l.label}
            </a>
          ))}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRestore(note)}
        aria-label={`Restore to ${PLACE_NAMES[place]}: ${title}`}
        title={`Restore to ${PLACE_NAMES[place]}`}
        class="press state-layer inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent"
      >
        <Icon name="reset" class="size-[18px]" />
        <span class="hidden sm:inline">Restore</span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(note)}
        aria-label={`Delete: ${title}`}
        title="Delete"
        class="press state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-error"
      >
        <Icon name="delete" class="size-[18px]" />
      </button>
    </li>
  );
}
