import { useState } from 'preact/hooks';
import { MAX_NOTE_LENGTH, parseDraft, TAG_LABELS, TAGS, validateDraft, type Draft, type Tag } from '../lib/notes.ts';
import { useSpeech } from '../lib/speech.ts';

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
      class="sticky bottom-0 -mx-4 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
      aria-label="Add a note"
    >
      <fieldset class="mb-2 flex gap-2">
        <legend class="sr-only">Tag</legend>
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tag === t}
            onClick={() => setTag(t)}
            class={`min-h-11 flex-1 rounded-full border px-3 text-sm ${
              tag === t ? 'border-accent bg-accent/15 font-semibold text-fg' : 'border-line text-muted'
            }`}
          >
            {TAG_LABELS[t]}
          </button>
        ))}
      </fieldset>
      <div class="flex items-end gap-2">
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
          class="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base text-fg placeholder:text-muted"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={speech.toggle}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? 'Stop dictation' : 'Dictate a note'}
            class={`min-h-11 min-w-11 rounded-xl border ${speech.listening ? 'border-accent text-accent' : 'border-line text-muted'}`}
          >
            🎙️
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          class="min-h-11 rounded-xl bg-accent px-4 font-semibold text-bg disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
      {error && (
        <p id="note-error" role="alert" class="mt-2 text-sm text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
