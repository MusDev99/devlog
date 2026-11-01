import { useState } from 'preact/hooks';
import { MAX_NOTE_LENGTH, parseDraft, TAG_LABELS, TAGS, validateDraft, type Draft, type Tag } from '../lib/notes.ts';
import { useSpeech } from '../lib/speech.ts';
import { Icon } from './Icon.tsx';

type Props = { onAdd: (draft: Draft) => Promise<void> };

/** Bottom-anchored composer (Fitts: thumb reach). Hick: three tags only, last one remembered. */
export function Composer({ onAdd }: Props) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState<Tag>('done');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const speech = useSpeech((heard) => setText((t) => (t ? `${t} ${heard}` : heard)));

  async function submit(e: Event) {
    e.preventDefault();
    const draft = parseDraft(text, tag);
    const problem = validateDraft(draft);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await onAdd(draft);
      setText('');
      setTag(draft.tag);
    } catch {
      setError('Could not save on this device. Your text is still here, try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      class="sticky bottom-0 -mx-4 rounded-t-[28px] bg-surface-high px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(0_0_0/0.35)]"
      aria-label="Add a note"
    >
      {/* Material filter chips: 32px visual, 44px touch target. */}
      <fieldset class="flex gap-2">
        <legend class="sr-only">Tag</legend>
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tag === t}
            onClick={() => setTag(t)}
            class="group flex min-h-11 flex-1 items-center"
          >
            <span
              class={`state-layer inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium ${
                tag === t ? 'bg-primary-container text-on-primary-container' : 'border border-outline text-muted'
              }`}
            >
              {tag === t && <Icon name="check" class="size-[18px]" />}
              {TAG_LABELS[t]}
            </span>
          </button>
        ))}
      </fieldset>
      <div class="mt-1 flex items-center gap-2">
        <div class="flex min-h-12 min-w-0 flex-1 items-center rounded-full bg-surface-highest pl-4 focus-within:outline-2 focus-within:outline-primary">
          <label class="sr-only" for="note-text">
            Note
          </label>
          <input
            id="note-text"
            value={text}
            onInput={(e) => setText(e.currentTarget.value)}
            maxLength={MAX_NOTE_LENGTH + 20}
            enterKeyHint="send"
            autoComplete="off"
            placeholder="What did you work on?"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'note-error' : undefined}
            class="min-h-11 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted"
          />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.toggle}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? 'Stop dictation' : 'Dictate a note'}
              class={`state-layer mr-0.5 grid size-11 shrink-0 place-items-center rounded-full ${
                speech.listening ? 'bg-primary-container text-on-primary-container' : 'text-muted'
              }`}
            >
              <Icon name={speech.listening ? 'stop' : 'mic'} class="size-6" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          class="state-layer inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-primary px-4 font-medium text-on-primary shadow-md disabled:opacity-60"
        >
          <Icon name="send" class="size-5" />
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
      {error && (
        <p id="note-error" role="alert" class="mt-2 px-4 text-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
