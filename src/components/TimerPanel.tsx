import { elapsedMs, formatClock, formatDuration, runMs, type Note } from '../lib/notes.ts';
import { plainText } from '../lib/links.ts';
import { taskTiming } from '../lib/timing.ts';
import { useClock } from '../lib/use-clock.ts';
import { Icon } from './Icon.tsx';

type Props = {
  task: Note | null;
  onToggle: () => void;
  onReset: () => void;
  onDone: () => void;
};

const R = 44;
const clockTime = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Stopwatch for the selected task: Start counts up from 0, Pause / Resume, Finish. The big number is
 * the actual time (span minus pauses); the line under it gives the span and the pauses. One big round
 * Start / Pause in the middle (Fitts, Von Restorff); Reset and Finish small on either side. The ring
 * sweeps once a minute so a running clock is visible at a glance.
 */
export function TimerPanel({ task, onToggle, onReset, onDone }: Props) {
  const running = Boolean(task?.startedAt);
  const nowMs = useClock(running);
  const total = task ? elapsedMs(task, nowMs) : 0;
  const run = task ? runMs(task, nowMs) : 0;
  const sweep = running ? (total % 60_000) / 60_000 : 0;
  const side = 'press state-layer grid size-12 place-items-center rounded-full bg-surface-high text-muted hover:text-fg disabled:opacity-40';
  const timing = task ? taskTiming(task, nowMs) : null;
  const status = !task ? 'No task selected' : running ? 'Running' : total > 0 ? 'Paused' : 'Ready';
  const action = running ? 'Pause' : total > 0 ? 'Resume' : 'Start';
  const pauses = timing && timing.pauses > 0 ? ` · ${timing.pauses} ${timing.pauses === 1 ? 'pause' : 'pauses'} (${formatDuration(timing.pausedMs, false)})` : '';

  return (
    <section aria-label="Task stopwatch" class="rounded-[28px] border border-line/70 bg-surface p-4 shadow-xl shadow-black/20 sm:p-6 [@media(hover:hover)]:bg-surface/80 [@media(hover:hover)]:backdrop-blur">
      <div class="flex min-h-11 items-center justify-center">
        {task ? (
          <p class="inline-flex max-w-full items-center gap-2 rounded-full bg-surface-high px-3.5 py-2 text-sm font-medium">
            <span aria-hidden="true" class={`size-2 shrink-0 rounded-full bg-accent ${running ? 'animate-glow' : ''}`} />
            <span class="truncate">{plainText(task.text)}</span>
          </p>
        ) : (
          <p class="text-sm text-muted">Pick a task to time it</p>
        )}
      </div>

      <div class="relative mx-auto mt-4 aspect-square w-full max-w-[232px] sm:max-w-[264px]">
        <svg viewBox="0 0 100 100" aria-hidden="true" class="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke-width="5" class="stroke-surface-high" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke-width="5"
            stroke-linecap="round"
            stroke-dasharray={CIRCUMFERENCE}
            stroke-dashoffset={CIRCUMFERENCE * (1 - sweep)}
            class={`stroke-accent [filter:drop-shadow(0_0_6px_var(--color-accent))] ${sweep > 0.02 ? 'transition-[stroke-dashoffset] duration-1000 ease-linear' : ''}`}
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 px-7 text-center">
          <p class="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Actual</p>
          <p role="timer" aria-live="off" class={`leading-none font-semibold tracking-tight tabular-nums ${total >= 3_600_000 ? 'text-5xl sm:text-[3.25rem]' : 'text-[3.5rem] sm:text-[4rem]'}`}>
            {formatClock(total)}
          </p>
          <p class="text-sm text-muted">{running ? `This run ${formatClock(run)}` : status}</p>
          {timing?.start && <p class="text-xs text-muted tabular-nums">Span {formatDuration(timing.spanMs, false)}{pauses}</p>}
        </div>
      </div>

      <div class="mt-5 flex items-center justify-center gap-5">
        <button type="button" onClick={onReset} disabled={!task || total === 0} aria-label="Reset to 00:00" title="Reset to 00:00" class={side}>
          <Icon name="reset" class="size-5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={!task}
          aria-label={action}
          title={`${action} (Space)`}
          class="press state-layer grid size-[72px] place-items-center rounded-full bg-accent text-on-accent shadow-lg shadow-[color-mix(in_oklab,var(--color-accent)_35%,transparent)] disabled:opacity-40 disabled:shadow-none"
        >
          <Icon name={running ? 'pause' : 'play'} class={`size-8 ${running ? '' : 'translate-x-0.5'}`} />
        </button>
        <button type="button" onClick={onDone} disabled={!task} aria-label="Finish task" title="Finish task" class={side}>
          <Icon name="check" class="size-5" />
        </button>
      </div>

      <p class="mt-4 text-center text-xs text-muted">
        {timing?.start ? `Started ${clockTime(timing.start)}` : 'Start · Pause · Resume · Finish'}
      </p>
    </section>
  );
}
