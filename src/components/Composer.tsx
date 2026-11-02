import { useState } from 'preact/hooks';
import { MAX_NOTE_LENGTH, parseDraft, validateDraft, type Draft } from '../lib/notes.ts';
import { useSpeech } from '../lib/speech.ts';
import { Icon } from './Icon.tsx';

type Props = { target: string; onAdd: (draft: Draft) => Promise<void> };

/**
 * Bottom-anchored composer (Fitts: thumb reach). Hick: no pickers here, a task goes to the selected
 * quadrant as To do; `wip:` / `b:` / `done:` prefixes still set its status without tapping.
 */
export function Composer({ target, onAdd }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const speech = useSpeech((heard) => setText((t) => (t ? `${t} ${heard}` : heard)));

  async function submit(e: Event) {
    e.preventDefault();
    const sent = text;
    const draft = parseDraft(sent, 'todo');
    const problem = validateDraft(draft);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await onAdd(draft);
      // Clear only what was saved: anything typed while saving stays in the field.
      setText((current) => (current.startsWith(sent) ? current.slice(sent.length).trimStart() : current));
    } catch {
      setError('Could not save on this device. Your text is still here, try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      class="sticky bottom-0 -mx-4 rounded-t-[28px] bg-surface-high px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(0_0_0/0.35)]"
      aria-label="Add a note"
    >
      <div class="mx-auto flex max-w-2xl items-center gap-2">
        <div class="flex min-h-12 min-w-0 flex-1 items-center rounded-full bg-surface-highest pl-4 focus-within:outline-2 focus-within:outline-primary">
          <label class="sr-only" for="note-text">
            New task in {target}
          </label>
          <input
            id="note-text"
            value={text}
            onInput={(e) => setText(e.currentTarget.value)}
            maxLength={MAX_NOTE_LENGTH + 20}
            enterKeyHint="send"
            autoComplete="off"
            placeholder={`Add to ${target}…`}
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
        <p id="note-error" role="alert" class="mx-auto mt-2 max-w-2xl px-4 text-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
