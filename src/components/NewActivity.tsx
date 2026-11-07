import { useEffect, useRef, useState } from 'preact/hooks';
import { emptyFlowDraft, FLOW_STEPS, flowResult, flowStepError, normalizeLink, type FlowDraft, type FlowStepId } from '../lib/flow.ts';
import { sourceOf } from '../lib/links.ts';
import { QUADRANT_LABELS, QUADRANTS, SIZES, type Draft, type Place, type Size } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';
import { PLACE_NAMES, PLACE_TONE } from './TaskRow.tsx';

type Props = { onAdd: (draft: Draft, size: Size, place: Place) => Promise<void> };

const SOURCE_NAMES = { jira: 'Jira ticket', github: 'GitHub repo', other: 'Site' } as const;
const LAST = FLOW_STEPS.length - 1;

/**
 * "New activity" on a phone: a guided flow, one question per screen (title, link, size, quadrant), like a booking
 * flow. The quick add stays for fast capture; this is for when you want to set the details. A native dialog, so
 * focus is trapped and Esc closes it. The rules (what blocks a step, how the answers become a task) are in lib/flow.ts.
 */
export function NewActivity({ onAdd }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [session, setSession] = useState(0);
  const [draft, setDraft] = useState<FlowDraft>(emptyFlowDraft);
  const [error, setError] = useState('');
  const [dir, setDir] = useState<'next' | 'back' | null>(null);
  const [busy, setBusy] = useState(false);
  const current = FLOW_STEPS[step] ?? FLOW_STEPS[0];

  // Each screen puts the cursor (or the chosen answer) where you act next.
  useEffect(() => {
    body.current?.querySelector<HTMLElement>('input, [aria-pressed="true"], button')?.focus();
  }, [step, session]);

  const open = () => {
    setDraft(emptyFlowDraft());
    setStep(0);
    setError('');
    setDir(null);
    setSession((n) => n + 1);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const edit = (patch: Partial<FlowDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
  };
  const goTo = (index: number, direction: 'next' | 'back') => {
    setDir(direction);
    setError('');
    setStep(index);
  };

  async function finish() {
    const result = flowResult(draft);
    if (!result.ok) {
      // Something no longer fits: back to the step that can fix it
      goTo(Math.max(0, FLOW_STEPS.findIndex((s) => s.id === result.step)), 'back');
      setError(result.error);
      return;
    }
    setBusy(true);
    try {
      await onAdd(result.draft, result.size, result.place);
      close();
    } catch {
      setError('Could not save on this device. Your answers are still here, try again.');
    } finally {
      setBusy(false);
    }
  }

  function advance() {
    const problem = flowStepError(current.id, draft);
    if (problem) return setError(problem);
    if (step === LAST) return void finish();
    goTo(step + 1, 'next');
  }

  function skip() {
    if (current.id === 'link') edit({ link: '' });
    if (current.id === 'size') edit({ size: null });
    if (current.id === 'place') edit({ place: 'unsorted' });
    if (step === LAST) return void finish();
    goTo(step + 1, 'next');
  }

  const titleBlocked = current.id === 'title' && flowStepError('title', draft) !== '';
  const input = 'min-h-14 w-full rounded-2xl border border-line bg-surface-high px-4 text-lg text-fg outline-none placeholder:text-muted focus:border-accent';

  return (
    <>
      <button
        id="new-activity"
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        class="press state-layer flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-accent/60 bg-accent/10 px-4 text-sm font-bold md:hidden"
      >
        <Icon name="add" class="size-[18px] text-accent" />
        New activity
        <span class="text-xs font-semibold text-muted">step by step</span>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="flow-question"
        class="m-0 h-dvh max-h-none w-full max-w-none bg-surface p-0 text-fg backdrop:bg-black/60 open:flex open:flex-col md:m-auto md:h-[min(40rem,90dvh)] md:max-w-md md:rounded-3xl"
      >
        <div class="flex items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => goTo(step - 1, 'back')}
            aria-label="Back"
            class={`press state-layer grid size-12 place-items-center rounded-full ${step === 0 ? 'invisible' : ''}`}
          >
            <Icon name="arrow" class="size-6 rotate-180" />
          </button>
          <span class="text-sm font-semibold tracking-wide text-muted" aria-hidden="true">
            Step {step + 1} of {FLOW_STEPS.length}
          </span>
          <button type="button" onClick={close} aria-label="Close" class="press state-layer grid size-12 place-items-center rounded-full">
            <Icon name="close" class="size-6" />
          </button>
        </div>
        <div role="progressbar" aria-label="New activity progress" aria-valuemin={1} aria-valuemax={FLOW_STEPS.length} aria-valuenow={step + 1} class="flex gap-1.5 px-5 pt-1">
          {FLOW_STEPS.map((s, i) => (
            <span key={s.id} class={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-surface-highest'}`} />
          ))}
        </div>

        <div ref={body} aria-live="polite" class="flex-1 overflow-y-auto px-5 pt-7 pb-4">
          <div key={step} class={dir === 'back' ? 'animate-flow-back' : dir === 'next' ? 'animate-flow-next' : ''}>
            <h2 id="flow-question" class="text-[1.7rem] leading-tight font-extrabold tracking-tight">
              {current.question}
            </h2>
            <p class="mt-2 text-muted">{current.hint}</p>
            <div class="mt-6">
              <Field id={current.id} draft={draft} edit={edit} input={input} onEnter={() => !titleBlocked && advance()} />
            </div>
            {error && (
              <p role="alert" class="mt-4 font-semibold text-error">
                {error}
              </p>
            )}
          </div>
        </div>

        <div class="flex items-center gap-3 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {current.skippable && (
            <button type="button" onClick={skip} disabled={busy} class="press state-layer min-h-12 rounded-xl px-2 text-base font-bold underline">
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={advance}
            disabled={titleBlocked || busy}
            class="press state-layer ml-auto min-h-14 min-w-36 rounded-2xl bg-accent px-7 text-lg font-extrabold text-on-accent disabled:opacity-40"
          >
            {step === LAST ? (busy ? 'Adding…' : 'Add activity') : 'Next'}
          </button>
        </div>
      </dialog>
    </>
  );
}

type FieldProps = { id: FlowStepId; draft: FlowDraft; edit: (patch: Partial<FlowDraft>) => void; input: string; onEnter: () => void };

/** The one control a step asks for. */
function Field({ id, draft, edit, input, onEnter }: FieldProps) {
  const enter = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    onEnter();
  };

  if (id === 'title') {
    return (
      <input
        type="text"
        value={draft.title}
        onInput={(e) => edit({ title: e.currentTarget.value })}
        onKeyDown={enter}
        placeholder="e.g. Fix the seat map crash"
        autoComplete="off"
        enterKeyHint="next"
        aria-label="What are you working on?"
        class={input}
      />
    );
  }

  if (id === 'link') {
    const link = normalizeLink(draft.link);
    const source = link.ok && link.href ? sourceOf(link.href) : null;
    return (
      <div>
        <input
          type="text"
          inputMode="url"
          value={draft.link}
          onInput={(e) => edit({ link: e.currentTarget.value })}
          onKeyDown={enter}
          placeholder="https://…"
          autoComplete="off"
          autoCapitalize="off"
          spellcheck={false}
          enterKeyHint="next"
          aria-label="Ticket or pull request link"
          class={input}
        />
        <p aria-live="polite" class={`mt-3 min-h-[1.4em] px-1 text-sm font-semibold ${link.ok && link.href ? 'text-fg' : 'text-muted'}`}>
          {!draft.link.trim() ? '' : !link.ok ? 'Not a link yet' : source ? `✓ ${SOURCE_NAMES[source.kind]}: ${source.label}` : '✓ Link'}
        </p>
      </div>
    );
  }

  if (id === 'size') {
    return (
      <div role="group" aria-label="Story points" class="grid grid-cols-4 gap-2.5">
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={draft.size === size}
            aria-label={`${size} story points`}
            // Tapping the chosen size again clears it
            onClick={() => edit({ size: draft.size === size ? null : size })}
            class={`press min-h-16 rounded-2xl border text-xl font-bold tabular-nums ${draft.size === size ? 'border-accent bg-accent/15 text-fg' : 'border-line bg-surface-high text-fg'}`}
          >
            {size}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Quadrant" class="grid gap-2.5">
      {QUADRANTS.map((place) => {
        const label = QUADRANT_LABELS[place];
        const chosen = draft.place === place;
        return (
          <button
            key={place}
            type="button"
            aria-pressed={chosen}
            // Tapping the chosen quadrant again puts it back to Unsorted
            onClick={() => edit({ place: chosen ? 'unsorted' : place })}
            class={`press flex min-h-[4.25rem] flex-col justify-center rounded-2xl border px-4 py-3 text-left ${chosen ? 'border-accent bg-accent/15' : 'border-line bg-surface-high'}`}
          >
            <span class="flex items-center gap-2 font-bold">
              <span aria-hidden="true" class={`size-2.5 rounded-full ${PLACE_TONE[place].dot}`} />
              {label.badge} · {PLACE_NAMES[place]}
            </span>
            <span class="text-sm text-muted">{label.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
