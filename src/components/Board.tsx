import { useState } from 'preact/hooks';
import { shortDay, type Column } from '../lib/board.ts';
import { NEXT_TAG, TAG_LABELS, TAGS, type Note, type Tag } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';

type Props = {
  columns: Column[];
  today: string;
  active: Tag;
  onSelect: (tag: Tag) => void;
  onMove: (note: Note, tag: Tag) => void;
  onDelete: (note: Note) => void;
};

/** Status is text + icon + edge colour, never colour alone. */
const TONE: Record<Tag, { text: string; edge: string }> = {
  todo: { text: 'text-muted', edge: 'border-l-outline' },
  doing: { text: 'text-warn', edge: 'border-l-warn' },
  blocker: { text: 'text-error', edge: 'border-l-error' },
  done: { text: 'text-ok', edge: 'border-l-ok' },
};

const EMPTY: Record<Tag, string> = {
  todo: 'Nothing planned. Add what is next below.',
  doing: 'Nothing in progress. Move a card here when you start it.',
  blocker: 'Nothing blocked.',
  done: 'Finished cards land here.',
};

/**
 * Kanban board. Phone: one column at a time behind count tabs (Hick, Fitts).
 * Wider screens: four columns side by side, cards drag between them.
 */
export function Board({ columns, today, active, onSelect, onMove, onDelete }: Props) {
  const [over, setOver] = useState<Tag | null>(null);
  const find = (id: string) => columns.flatMap((c) => [...c.cards, ...c.earlier]).find((n) => n.id === id);

  return (
    <div>
      <div role="tablist" aria-label="Board columns" class="grid grid-cols-4 gap-1 rounded-3xl bg-surface p-1 md:hidden">
        {columns.map((c) => (
          <button
            key={c.tag}
            type="button"
            role="tab"
            id={`tab-${c.tag}`}
            aria-selected={active === c.tag}
            aria-controls={`col-${c.tag}`}
            onClick={() => onSelect(c.tag)}
            class={`state-layer flex min-h-14 flex-col items-center justify-center rounded-[20px] ${
              active === c.tag ? 'bg-primary-container text-on-primary-container' : 'text-muted'
            }`}
          >
            <span class="text-lg leading-6 font-medium">{c.cards.length}</span>
            <span class="text-xs font-medium">{TAG_LABELS[c.tag]}</span>
          </button>
        ))}
      </div>

      <div class="mt-3 grid gap-3 md:mt-0 md:grid-cols-4 md:items-start">
        {columns.map((c) => (
          <section
            key={c.tag}
            id={`col-${c.tag}`}
            aria-labelledby={`col-title-${c.tag}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(c.tag);
            }}
            onDragLeave={(e) => {
              if (!(e.currentTarget as Node).contains(e.relatedTarget as Node | null)) setOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const note = find(e.dataTransfer?.getData('text/plain') ?? '');
              if (note && note.tag !== c.tag) onMove(note, c.tag);
            }}
            class={`${active === c.tag ? 'flex' : 'hidden'} flex-col gap-2 rounded-3xl md:flex md:min-h-40 md:bg-surface md:p-2 ${
              over === c.tag ? 'outline-2 outline-primary outline-dashed' : ''
            }`}
          >
            <h2 id={`col-title-${c.tag}`} class="sr-only md:not-sr-only">
              <button
                type="button"
                aria-pressed={active === c.tag}
                onClick={() => onSelect(c.tag)}
                class={`state-layer flex min-h-11 w-full items-center gap-2 rounded-full px-3 text-sm font-medium ${
                  active === c.tag ? 'bg-primary-container text-on-primary-container' : ''
                }`}
              >
                <Icon name={c.tag} class={`size-[18px] ${active === c.tag ? '' : TONE[c.tag].text}`} />
                {TAG_LABELS[c.tag]}
                <span class="ml-auto text-xs text-muted">{c.cards.length}</span>
              </button>
            </h2>

            {c.cards.length === 0 && <p class="px-3 py-4 text-sm leading-5 text-muted">{EMPTY[c.tag]}</p>}
            <ul class="grid gap-2">
              {c.cards.map((note) => (
                <Card key={note.id} note={note} today={today} onMove={onMove} onDelete={onDelete} />
              ))}
            </ul>

            {c.earlier.length > 0 && (
              <details class="group px-1">
                <summary class="state-layer flex min-h-11 cursor-pointer list-none items-center justify-between rounded-full px-3 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
                  Earlier · {c.earlier.length}
                  <Icon name="expand" class="size-6 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <ul class="mt-2 grid gap-2">
                  {c.earlier.map((note) => (
                    <Card key={note.id} note={note} today={today} onMove={onMove} onDelete={onDelete} />
                  ))}
                </ul>
              </details>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

type CardProps = { note: Note; today: string; onMove: (note: Note, tag: Tag) => void; onDelete: (note: Note) => void };

/** One card: a one-tap "next column" button, and a menu for any other column or delete. */
function Card({ note, today, onMove, onDelete }: CardProps) {
  const [open, setOpen] = useState(false);
  const next = NEXT_TAG[note.tag];
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer?.setData('text/plain', note.id);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      }}
      class={`rounded-2xl border-l-4 bg-surface-high md:cursor-grab ${TONE[note.tag].edge}`}
    >
      <div class="flex items-start gap-0.5 py-1 pr-1 pl-3">
        <div class="min-w-0 flex-1 py-2">
          <p class="leading-6 break-words">{note.text}</p>
          <p class="mt-0.5 text-xs text-muted">{shortDay(note.day, today)}</p>
        </div>
        {next && (
          <button
            type="button"
            onClick={() => onMove(note, next)}
            aria-label={`Move to ${TAG_LABELS[next]}: ${note.text}`}
            title={`Move to ${TAG_LABELS[next]}`}
            class="state-layer grid size-11 shrink-0 place-items-center rounded-full text-primary"
          >
            <Icon name="next" class="size-5" />
          </button>
        )}
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
        <div class="flex flex-wrap gap-2 border-t border-line px-3 py-2">
          {TAGS.filter((t) => t !== note.tag).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onMove(note, t)}
              class="state-layer inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-outline px-3 text-sm font-medium"
            >
              <Icon name={t} class={`size-[18px] ${TONE[t].text}`} />
              {TAG_LABELS[t]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onDelete(note)}
            aria-label={`Delete card: ${note.text}`}
            class="state-layer inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-error"
          >
            <Icon name="delete" class="size-[18px]" />
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
