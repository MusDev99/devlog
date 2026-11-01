import { groupByTag, TAG_LABELS, TAGS, type Note } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';

type Props = { notes: Note[]; onDelete: (note: Note) => void };

const TONE: Record<Note['tag'], string> = { done: 'text-ok', doing: 'text-warn', blocker: 'text-error' };

/** Miller: notes chunked into three groups. Status is text + icon, never colour alone. */
export function NoteList({ notes, onDelete }: Props) {
  const groups = groupByTag(notes);
  return (
    <div class="mt-4 grid gap-4">
      {TAGS.filter((t) => groups[t].length > 0).map((t) => (
        <section key={t} aria-labelledby={`group-${t}`}>
          <h3 id={`group-${t}`} class={`flex items-center gap-2 px-1 text-sm font-medium tracking-wide ${TONE[t]}`}>
            <Icon name={t} class="size-[18px]" />
            {TAG_LABELS[t]} · {groups[t].length}
          </h3>
          {/* Material list: one container, items split by 2px gaps, ends rounded. */}
          <ul class="mt-2 grid gap-0.5 overflow-hidden rounded-2xl">
            {groups[t].map((note) => (
              <li key={note.id} class="flex min-h-14 items-center gap-2 bg-surface-high py-1 pr-1 pl-4">
                <span class="min-w-0 flex-1 py-2 leading-6 break-words">{note.text}</span>
                <button
                  type="button"
                  onClick={() => onDelete(note)}
                  aria-label={`Delete note: ${note.text}`}
                  class="state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-fg"
                >
                  <Icon name="delete" class="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
