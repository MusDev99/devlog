import { useState } from 'preact/hooks';
import type { Note } from '../lib/notes.ts';
import { formatRecap, isRecapDay, rangeLabel, weekRange, weekRecap } from '../lib/recap.ts';
import { formatStandup, ruleStandup } from '../lib/standup.ts';
import { Icon } from './Icon.tsx';

type Props = { today: string; tasks: Note[]; onToast: (message: string) => void };
type Tab = 'standup' | 'week';

/**
 * Standup and week recap in one card (Hick: one place to look). Both are rebuilt live from the
 * tasks on this device, so there is no "build" step; Copy is the only action (Tesler).
 */
export function Reports({ today, tasks, onToast }: Props) {
  // Friday and the weekend open on the recap; other days on the standup.
  const [tab, setTab] = useState<Tab>(() => (isRecapDay(today) ? 'week' : 'standup'));
  const { start, end } = weekRange(today);
  const label = rangeLabel(start, end);

  const standup = ruleStandup(tasks, today);
  const recap = weekRecap(tasks.filter((t) => t.day >= start && t.day <= end));
  const sections: [string, string[]][] =
    tab === 'standup'
      ? [
          ['Yesterday', standup.yesterday],
          ['Today', standup.today],
          ['Blockers', standup.blockers],
        ]
      : [
          ['Shipped', recap.shipped],
          ['In progress', recap.inProgress],
          ['Blockers', recap.blockers],
        ];
  const empty = sections.every(([, items]) => items.length === 0);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tab === 'standup' ? formatStandup(standup) : formatRecap(recap, label));
      onToast(tab === 'standup' ? 'Standup copied' : 'Week recap copied');
    } catch {
      onToast('Copy blocked by the browser, select the text instead');
    }
  }

  return (
    <section aria-label="Reports" class="rounded-[28px] border border-line/70 bg-surface/80 p-4 sm:p-5">
      <div class="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Report" class="flex rounded-full bg-surface-low p-1">
          {(['standup', 'week'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              class={`press min-h-11 rounded-full px-4 text-sm font-medium transition-colors ${tab === t ? 'bg-surface-highest text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              {t === 'standup' ? 'Standup' : 'Week'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={empty}
          class="press state-layer inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-high px-4 text-sm font-medium disabled:opacity-40"
        >
          <Icon name="copy" class="size-[18px]" />
          Copy
        </button>
      </div>

      <p class="mt-3 px-1 text-xs text-muted">
        {tab === 'standup'
          ? 'Ready to paste into your team chat'
          : `${label} · ${recap.activeDays} ${recap.activeDays === 1 ? 'day' : 'days'} logged`}
      </p>

      {empty ? (
        <p class="px-1 py-6 text-sm text-muted">
          {tab === 'standup' ? 'Nothing to report yet. Finish or start a task and it shows up here.' : 'Nothing moved this week yet.'}
        </p>
      ) : (
        <div aria-live="polite" class="mt-3 grid gap-3 px-1">
          {sections.map(([title, items]) => (
            <div key={title}>
              <h3 class="text-[11px] font-semibold tracking-wider text-muted uppercase">
                {title}
                {tab === 'week' && ` · ${items.length}`}
              </h3>
              {items.length > 0 ? (
                <ul class="mt-1.5 grid gap-1 text-sm leading-5">
                  {items.map((item, i) => (
                    <li key={i} class="flex gap-2">
                      <span aria-hidden="true" class={`mt-2 size-1 shrink-0 rounded-full ${title === 'Blockers' ? 'bg-error' : 'bg-outline'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="mt-1.5 text-sm text-muted">None</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
