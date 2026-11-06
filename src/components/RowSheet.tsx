import { useEffect, useRef } from 'preact/hooks';
import { titleText } from '../lib/links.ts';
import { PLACES, placeOf, SIZES, sizeOf, TAG_LABELS, type Note, type Place, type Size, type Tag } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';
import { PLACE_NAMES, PLACE_TONE } from './TaskRow.tsx';

type Props = {
  /** The task whose actions are open; null closes the sheet. Read live from the list, so a change shows at once. */
  note: Note | null;
  onClose: () => void;
  onPlace: (note: Note, place: Place) => void;
  onStatus: (note: Note, tag: Tag) => void;
  onSize: (note: Note, size: Size) => void;
  onDelete: (note: Note) => void;
};

const chipBase = 'press state-layer inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium';
const label = 'text-[11px] font-semibold tracking-wider text-muted uppercase';

/**
 * One bottom sheet for every row's actions (Hick: the same four choices, always in the same place; Fitts: in thumb
 * reach). A native modal dialog, so focus is trapped, Esc closes and the page behind is inert. It replaces the old
 * inline menu, which pushed the list down under the finger.
 */
export function RowSheet({ note, onClose, onPlace, onStatus, onSize, onDelete }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = note !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const done = note?.tag === 'done';
  const size = note ? sizeOf(note) : 1;
  const place = note ? placeOf(note) : 'unsorted';
  const act = <A extends unknown[]>(fn: (n: Note, ...a: A) => void, close = true) => (...a: A) => {
    if (!note) return;
    fn(note, ...a);
    if (close) onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="sheet-title"
      class="sheet m-0 mt-auto w-full max-w-none rounded-t-[28px] border-t border-line/70 bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 sm:mx-auto sm:max-w-md sm:rounded-[28px]"
    >
      {note && (
        <div class="grid gap-4 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div aria-hidden="true" class="mx-auto h-1 w-10 rounded-full bg-outline/60 sm:hidden" />
          <div class="flex items-start justify-between gap-3">
            <h2 id="sheet-title" class="min-w-0 pt-2 text-base leading-snug font-semibold break-words">
              {titleText(note.text)}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" class="press state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted">
              <Icon name="close" class="size-5" />
            </button>
          </div>

          {!done && (
            <section>
              <p class={label}>Move to</p>
              <div class="mt-2 flex flex-wrap gap-2">
                {PLACES.filter((p) => p !== place).map((p) => (
                  <button key={p} type="button" onClick={() => act(onPlace)(p)} class={`${chipBase} bg-surface-highest/60`}>
                    <span aria-hidden="true" class={`size-2 rounded-full ${PLACE_TONE[p].dot}`} />
                    {PLACE_NAMES[p]}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <p class={label}>Story points</p>
            <div class="mt-2 flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={s === size}
                  aria-label={`${s} story points`}
                  onClick={() => act(onSize, false)(s)}
                  class={`${chipBase} min-w-11 justify-center tabular-nums ${s === size ? 'bg-accent font-semibold text-on-accent' : 'bg-surface-highest/60'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {!done && (
            <section>
              <p class={label}>Status</p>
              <div class="mt-2 flex flex-wrap gap-2">
                {(['todo', 'doing', 'blocker'] as const)
                  .filter((t) => t !== note.tag)
                  .map((t) => (
                    <button key={t} type="button" onClick={() => act(onStatus)(t)} class={`${chipBase} bg-surface-highest/60`}>
                      {TAG_LABELS[t]}
                    </button>
                  ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={() => act(onDelete)()}
            class="press state-layer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-error/10 px-3 text-sm font-semibold text-error"
          >
            <Icon name="delete" class="size-[18px]" />
            Delete task
          </button>
        </div>
      )}
    </dialog>
  );
}
