import { elapsedMs, formatClock, formatDuration, runMs, type Note } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';

type Props = {
  task: Note | null;
  nowMs: number;
  onToggle: () => void;
  onReset: () => void;
  onDone: () => void;
};

const R = 44;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Stopwatch for the selected task: counts up from 0 on Start, banks the time on Stop, and keeps a
 * running total per task. One big round Start/Stop in the middle (Fitts, Von Restorff); Reset and
 * Done small on either side. The ring sweeps once a minute so a running clock is visible at a glance.
 */
export function TimerPanel({ task, nowMs, onToggle, onReset, onDone }: Props) {
  const running = Boolean(task?.startedAt);
  const total = task ? elapsedMs(task, nowMs) : 0;
  const run = task ? runMs(task, nowMs) : 0;
  const sweep = running ? (total % 60_000) / 60_000 : 0;
  const side = 'press state-layer grid size-12 place-items-center rounded-full bg-surface-high text-muted hover:text-fg disabled:opacity-40';
  const status = !task ? 'No task selected' : running ? 'Running' : total > 0 ? 'Stopped' : 'Ready';

  return (
    <section aria-label="Task stopwatch" class="rounded-[28px] border border-line/70 bg-surface/80 p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
      <div class="flex min-h-11 items-center justify-center">
        {task ? (
          <p class="inline-flex max-w-full items-center gap-2 rounded-full bg-surface-high px-3.5 py-2 text-sm font-medium">
            <span aria-hidden="true" class={`size-2 shrink-0 rounded-full bg-accent ${running ? 'animate-glow' : ''}`} />
            <span class="truncate">{task.text}</span>
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
          <p class="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Total elapsed</p>
          <p role="timer" aria-live="off" class={`leading-none font-semibold tracking-tight tabular-nums ${total >= 3_600_000 ? 'text-5xl sm:text-[3.25rem]' : 'text-[3.5rem] sm:text-[4rem]'}`}>
            {formatClock(total)}
          </p>
          <p class="text-sm text-muted">{running ? `This run ${formatClock(run)}` : status}</p>
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
          aria-label={running ? 'Stop' : 'Start'}
          title={`${running ? 'Stop' : 'Start'} (Space)`}
          class="press state-layer grid size-[72px] place-items-center rounded-full bg-accent text-on-accent shadow-lg shadow-[color-mix(in_oklab,var(--color-accent)_35%,transparent)] disabled:opacity-40 disabled:shadow-none"
        >
          <Icon name={running ? 'stop' : 'play'} class={`size-8 ${running ? '' : 'translate-x-0.5'}`} />
        </button>
        <button type="button" onClick={onDone} disabled={!task} aria-label="Stop and mark done" title="Stop and mark done" class={side}>
          <Icon name="check" class="size-5" />
        </button>
      </div>

      <p class="mt-4 text-center text-xs text-muted">
        {task && total > 0 && !running ? `Logged ${formatDuration(total, false)} so far` : 'Start counts up · Stop keeps the total'}
      </p>
    </section>
  );
}
