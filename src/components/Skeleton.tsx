/**
 * Loading placeholders that match the real layout (same blocks, same heights), so nothing jumps when the
 * data arrives. They are always in the layout but invisible for the first 150 ms (`visible`), so a fast
 * load shows nothing at all and a slow one fades the shimmer in.
 */
type Visible = { visible: boolean };

const fade = (visible: boolean) => `transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`;
/** A shimmering block; `skeleton` (styles.css) sweeps a light band across it by transform only. */
const block = 'skeleton rounded-xl bg-surface-highest/60';

/** One task row: tick, a title bar, SP chip, play button (the TaskRow shape). */
function RowSkeleton({ width }: { width: string }) {
  return (
    <li class="flex min-h-[52px] items-center gap-2 rounded-xl bg-surface-high/80 pr-2 pl-3">
      <span class={`${block} size-5 shrink-0 rounded-full`} />
      <span class={`${block} h-3.5 ${width}`} />
      <span class={`${block} ml-auto h-5 w-6 shrink-0 rounded-md`} />
      <span class={`${block} size-8 shrink-0 rounded-full`} />
    </li>
  );
}

const WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-4/5'];

/** Tasks section: header + progress bar, composer, two quadrant panels of rows. */
export function TasksSkeleton({ visible }: Visible) {
  return (
    <div role="status" aria-label="Loading tasks" class={fade(visible)}>
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <div class={`${block} h-6 w-24`} />
          <div class={`${block} mt-2 h-1 w-full rounded-full`} />
        </div>
        <div class={`${block} h-[52px] w-[100px] shrink-0 rounded-full`} />
      </div>
      <div class={`${block} mt-4 h-12 w-full rounded-2xl`} />
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        {[3, 2].map((rows, p) => (
          <div key={p} class="rounded-2xl bg-surface-low p-2.5">
            <div class={`${block} mx-1.5 mb-2.5 h-4 w-28`} />
            <ul class="grid gap-1.5">
              {Array.from({ length: rows }, (_, i) => (
                <RowSkeleton key={i} width={WIDTHS[(p + i) % WIDTHS.length] ?? 'w-1/2'} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stats: the cards in the order and size StatsView draws them. */
export function StatsSkeleton({ visible }: Visible) {
  const card = 'rounded-[28px] bg-surface p-5';
  return (
    <div role="status" aria-label="Loading stats" class={`grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 ${fade(visible)}`}>
      <div class={card}>
        <div class={`${block} h-4 w-28`} />
        <div class="mt-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} class={`${block} h-20`} />
          ))}
        </div>
      </div>
      <div class={card}>
        <div class={`${block} h-4 w-32`} />
        <div class="mt-4 flex h-28 items-end gap-2">
          {['h-1/3', 'h-2/3', 'h-1/2', 'h-full', 'h-2/5', 'h-3/4', 'h-1/4'].map((h, i) => (
            <div key={i} class={`${block} flex-1 ${h}`} />
          ))}
        </div>
      </div>
      <div class={card}>
        <div class={`${block} h-4 w-36`} />
        <div class="mt-4 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} class={`${block} h-9`} />
          ))}
        </div>
      </div>
      <div class={`${card} lg:col-span-2`}>
        <div class={`${block} h-4 w-40`} />
        <div class={`${block} mt-4 h-28`} />
      </div>
    </div>
  );
}

/** A generic card (the Standup / Week card while tasks load). */
export function CardSkeleton({ visible }: Visible) {
  return (
    <div role="status" aria-label="Loading" class={`rounded-[28px] bg-surface p-5 ${fade(visible)}`}>
      <div class={`${block} h-4 w-32`} />
      <div class="mt-4 grid gap-3">
        {['w-full', 'w-4/5', 'w-3/5'].map((w) => (
          <div key={w} class={`${block} h-4 ${w}`} />
        ))}
      </div>
    </div>
  );
}
