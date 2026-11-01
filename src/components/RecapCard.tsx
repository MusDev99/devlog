import { useState } from 'preact/hooks';
import type { Note } from '../lib/notes.ts';
import { formatRecap, isRecapDay, rangeLabel, weekRange, weekRecap } from '../lib/recap.ts';
import { Icon } from './Icon.tsx';

type Props = { today: string; cards: Note[]; onToast: (message: string) => void };

/** Friday recap from cards changed this week, built on the phone (works offline). */
export function RecapCard({ today, cards, onToast }: Props) {
  // Hick: open by itself only on Friday and the weekend; other days it is one tap away.
  const [open, setOpen] = useState(() => isRecapDay(today));
  const { start, end } = weekRange(today);
  const label = rangeLabel(start, end);
  const recap = open ? weekRecap(cards.filter((c) => c.day >= start && c.day <= end)) : null;

  async function copy() {
    if (!recap) return;
    try {
      await navigator.clipboard.writeText(formatRecap(recap, label));
      onToast('Week recap copied');
    } catch {
      onToast('Copy blocked by the browser, select the text instead');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        class="state-layer flex min-h-14 w-full items-center justify-between gap-3 rounded-3xl bg-surface px-5 text-left"
      >
        <span class="font-medium">Week so far</span>
        <span class="flex items-center gap-1 text-sm text-muted">
          {label}
          <Icon name="expand" class="size-6" />
        </span>
      </button>
    );
  }

  const sections: [string, string[]][] = recap
    ? [
        ['Shipped', recap.shipped],
        ['In progress', recap.inProgress],
        ['Blockers', recap.blockers],
      ]
    : [];

  return (
    <section aria-labelledby="recap-title" class="rounded-3xl bg-surface p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 id="recap-title" class="text-[1.375rem] leading-7">
          {isRecapDay(today) ? 'Friday recap' : 'Week so far'}
        </h2>
        <span class="text-right text-xs text-muted">
          {label}
          {recap && ` · ${recap.activeDays} ${recap.activeDays === 1 ? 'day' : 'days'}`}
        </span>
      </div>

      {recap && recap.activeDays === 0 && <p class="mt-3 leading-6 text-muted">Nothing moved this week yet. Your recap fills in as you work the board.</p>}
      {recap && recap.activeDays > 0 && (
        <div aria-live="polite" class="mt-4 grid gap-4">
          {sections.map(([title, items]) => (
            <div key={title}>
              <h3 class="text-sm font-medium tracking-wide text-primary">
                {title} · {items.length}
              </h3>
              <ul class="mt-1 list-disc pl-5 leading-6 marker:text-outline">
                {items.length > 0 ? items.map((item, i) => <li key={i}>{item}</li>) : <li class="text-muted">None</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(recap?.activeDays || !isRecapDay(today)) && (
        <div class="mt-5 flex gap-2">
          {recap && recap.activeDays > 0 && (
            <button
              type="button"
              onClick={copy}
              class="state-layer inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-outline px-5 text-sm font-medium text-primary"
            >
              <Icon name="copy" class="size-[18px]" />
              Copy recap
            </button>
          )}
          {!isRecapDay(today) && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              class="state-layer min-h-11 rounded-full px-4 text-sm font-medium text-primary"
            >
              Hide
            </button>
          )}
        </div>
      )}
    </section>
  );
}
