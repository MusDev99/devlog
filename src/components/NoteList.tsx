import { groupByTag, TAG_LABELS, TAGS, type Note } from '../lib/notes.ts';

type Props = { notes: Note[]; onDelete: (note: Note) => void };

const DOT: Record<Note['tag'], string> = { done: 'bg-ok', doing: 'bg-warn', blocker: 'bg-accent' };

/** Miller: notes chunked into three groups. Status is text + dot, never colour alone. */
export function NoteList({ notes, onDelete }: Props) {
  const groups = groupByTag(notes);
  return (
    <div class="mt-3 grid gap-4">
      {TAGS.filter((t) => groups[t].length > 0).map((t) => (
        <section key={t} aria-labelledby={`group-${t}`}>
          <h3 id={`group-${t}`} class="flex items-center gap-2 text-sm font-semibold text-muted">
            <span aria-hidden="true" class={`size-2 rounded-full ${DOT[t]}`} />
            {TAG_LABELS[t]} · {groups[t].length}
          </h3>
          <ul class="mt-1 divide-y divide-line">
            {groups[t].map((note) => (
              <li key={note.id} class="flex items-center gap-2 py-1">
                <span class="min-w-0 flex-1 break-words">{note.text}</span>
                <button
                  type="button"
                  onClick={() => onDelete(note)}
                  aria-label={`Delete note: ${note.text}`}
                  class="min-h-11 min-w-11 rounded-lg text-muted hover:text-fg"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
