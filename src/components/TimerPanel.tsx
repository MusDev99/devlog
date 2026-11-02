import type { Note } from '../lib/notes.ts';
import { formatClock, isRunning, LONG_EVERY, MODE_LABELS, MODES, progress, remainingMs, fullMs, type Mode, type Session } from '../lib/pomodoro.ts';
import { Icon } from './Icon.tsx';

type Props = {
  session: Session;
  nowMs: number;
  task: Note | null;
  onMode: (mode: Mode) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
};

const R = 45;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Pomodoro: mode switch, a ring that fills as the round runs, the focus task, Start/Pause and Reset. */
export function TimerPanel({ session, nowMs, task, onMode, onStart, onPause, onReset }: Props) {
  const running = isRunning(session);
  const left = remainingMs(session, nowMs);
  const fresh = !running && left === fullMs(session.mode);
  const status = running ? (session.mode === 'focus' ? 'Focusing' : 'On a break') : fresh ? 'Ready' : 'Paused';
  const done = session.rounds % LONG_EVERY;

  return (
    <section aria-label="Pomodoro timer" class="rounded-[28px] border border-line/60 bg-surface p-4 sm:p-6">
      <div role="tablist" aria-label="Timer mode" class="grid grid-cols-3 gap-1 rounded-full bg-surface-high p-1">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={session.mode === mode}
            onClick={() => onMode(mode)}
            class={`state-layer min-h-11 rounded-full px-2 text-sm font-medium ${session.mode === mode ? 'bg-bg text-fg shadow-sm' : 'text-muted'}`}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <div class="relative mx-auto mt-6 aspect-square w-full max-w-[240px] sm:max-w-[270px]">
        <svg viewBox="0 0 100 100" aria-hidden="true" class="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke-width="3" class="stroke-surface-highest" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray={CIRCUMFERENCE}
            stroke-dashoffset={CIRCUMFERENCE * (1 - progress(session, nowMs))}
            class={`transition-[stroke-dashoffset] duration-1000 ease-linear ${session.mode === 'focus' ? 'stroke-primary' : 'stroke-ok'}`}
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p role="timer" aria-live="off" class="text-6xl leading-none font-semibold tracking-tight tabular-nums sm:text-7xl">
            {formatClock(left)}
          </p>
          <p class="text-sm text-muted">{status}</p>
          {task ? (
            <p class="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface-high px-3 py-1 text-xs font-medium">
              <span aria-hidden="true">🎯</span>
              <span class="truncate">{task.text}</span>
            </p>
          ) : (
            session.mode === 'focus' && <p class="mt-1 text-xs text-muted">Tap a task to focus on it</p>
          )}
        </div>
      </div>

      <div class="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={running ? onPause : onStart}
          class="state-layer inline-flex min-h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-on-primary shadow-md"
        >
          <Icon name={running ? 'pause' : 'play'} class="size-5" />
          {running ? 'Pause' : fresh ? 'Start' : 'Resume'}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={fresh}
          class="state-layer inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-surface-highest px-5 text-base font-medium text-muted disabled:opacity-50"
        >
          <Icon name="reset" class="size-5" />
          Reset
        </button>
      </div>

      <p class="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted" aria-label={`${done} of ${LONG_EVERY} focus rounds before a long break`}>
        {Array.from({ length: LONG_EVERY }, (_, i) => (
          <span key={i} aria-hidden="true" class={`size-2 rounded-full ${i < done ? 'bg-primary' : 'bg-surface-highest'}`} />
        ))}
        <span class="ml-1">long break after {LONG_EVERY}</span>
      </p>
    </section>
  );
}
