import type { Stats } from '../lib/matrix.ts';
import { elapsedMs, formatDuration, QUADRANT_LABELS, quadrantOf, type Note } from '../lib/notes.ts';
import { Icon } from './Icon.tsx';

type Props = { stats: Stats; running: Note | null; nowMs: number; onStop: (note: Note) => void };

/** Dashboard strip: what is running now (with Stop in reach), then three numbers for the open work. */
export function Overview({ stats, running, nowMs, onStop }: Props) {
  const tiles: [string, string][] = [
    ['Open tasks', String(stats.open)],
    ['Points', String(stats.points)],
    ['Tracked', formatDuration(stats.trackedMs, false)],
  ];
  return (
    <div class="grid gap-3">
      {running && (
        <div role="status" class="flex min-w-0 items-center gap-3 rounded-3xl bg-primary-container py-2 pr-2 pl-4 text-on-primary-container">
          <Icon name="timer" class="size-6 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{running.text}</p>
            <p class="text-xs">{QUADRANT_LABELS[quadrantOf(running)].name} · running</p>
          </div>
          <span class="text-lg font-medium tabular-nums">{formatDuration(elapsedMs(running, nowMs), true)}</span>
          <button
            type="button"
            onClick={() => onStop(running)}
            class="state-layer inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-on-primary"
          >
            <Icon name="stop" class="size-[18px]" />
            Stop
          </button>
        </div>
      )}
      <dl class="grid grid-cols-3 gap-2">
        {tiles.map(([label, value]) => (
          <div key={label} class="rounded-2xl bg-surface px-3 py-2.5">
            <dt class="text-xs text-muted">{label}</dt>
            <dd class="mt-0.5 text-xl leading-7 font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
