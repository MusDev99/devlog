import { useState } from 'preact/hooks';
import { MAX_NOTE_LENGTH, parseDraft, SIZES, validateDraft, type Draft, type Size } from '../lib/notes.ts';
import { useSpeech } from '../lib/speech.ts';
import { Icon } from './Icon.tsx';

type Props = { onAdd: (draft: Draft, size: Size, focus: boolean) => Promise<void> };

/**
 * Add row: text (or voice), size, and two ways to add. New tasks land in Unsorted.
 * ▶ adds it and starts its stopwatch in one tap (Fitts); `wip:` / `b:` / `done:` prefixes set a status.
 */
export function Composer({ onAdd }: Props) {
  const [text, setText] = useState('');
  const [size, setSize] = useState<Size>(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const speech = useSpeech((heard) => setText((t) => (t ? `${t} ${heard}` : heard)));

  async function submit(focus: boolean) {
    const sent = text;
    const draft = parseDraft(sent, 'todo');
    const problem = validateDraft(draft);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await onAdd(draft, size, focus);
      // Clear only what was saved: anything typed while saving stays in the field.
      setText((current) => (current.startsWith(sent) ? current.slice(sent.length).trimStart() : current));
    } catch {
      setError('Could not save on this device. Your text is still here, try again.');
    } finally {
      setSaving(false);
    }
  }

  const square = 'press state-layer grid size-12 shrink-0 place-items-center rounded-2xl';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
      aria-label="Add a task"
    >
      <div class="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {/* Phone: the text gets a full line (Fitts); the controls sit under it, to the right. */}
        <div class="flex min-h-12 w-full min-w-0 items-center rounded-2xl border border-transparent bg-surface-high pl-4 transition-colors focus-within:border-accent/60 hover:border-line sm:w-auto sm:flex-1">
          <label class="sr-only" for="note-text">
            New task
          </label>
          <input
            id="note-text"
            value={text}
            onInput={(e) => setText(e.currentTarget.value)}
            maxLength={MAX_NOTE_LENGTH + 20}
            enterKeyHint="send"
            autoComplete="off"
            placeholder="What are you focusing on?"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'note-error' : undefined}
            class="min-h-11 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted"
          />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.toggle}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? 'Stop dictation' : 'Dictate a task'}
              class={`state-layer mr-0.5 grid size-11 shrink-0 place-items-center rounded-full ${
                speech.listening ? 'bg-primary-container text-on-primary-container' : 'text-muted'
              }`}
            >
              <Icon name={speech.listening ? 'stop' : 'mic'} class="size-5" />
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit(true)}
          aria-label="Add and start timer"
          title="Add and start timer"
          class={`${square} ml-auto bg-surface-high text-accent disabled:opacity-60 sm:ml-0`}
        >
          <Icon name="play" class="size-5" />
        </button>
        <label class="sr-only" for="note-size">
          Size in story points
        </label>
        <select
          id="note-size"
          value={size}
          onChange={(e) => setSize(Number(e.currentTarget.value) as Size)}
          class="min-h-12 shrink-0 cursor-pointer rounded-2xl bg-surface-high px-3 text-sm font-medium text-fg"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s} SP
            </option>
          ))}
        </select>
        <button type="submit" disabled={saving} aria-label="Add task" class={`${square} bg-accent text-on-accent shadow-md disabled:opacity-60`}>
          <Icon name="add" class="size-6" />
        </button>
      </div>
      {error && (
        <p id="note-error" role="alert" class="mt-2 px-1 text-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
