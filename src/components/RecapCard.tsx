import { useEffect, useState } from 'preact/hooks';
import { notesBetween } from '../lib/db.ts';
import type { Note } from '../lib/notes.ts';
import { formatRecap, isRecapDay, rangeLabel, weekRange, weekRecap, type Recap } from '../lib/recap.ts';

type Props = { today: string; notes: Note[]; onToast: (message: string) => void };

/** Friday recap from this week's notes, built on the phone (works offline). */
export function RecapCard({ today, notes, onToast }: Props) {
  // Hick: open by itself only on Friday and the weekend; other days it is one tap away.
  const [open, setOpen] = useState(() => isRecapDay(today));
  const [recap, setRecap] = useState<Recap | null>(null);
  const [failed, setFailed] = useState(false);
  const { start, end } = weekRange(today);
  const label = rangeLabel(start, end);

  useEffect(() => {
    if (!open) return;
    let live = true;
    notesBetween(start, end)
      .then((week) => live && (setRecap(weekRecap(week)), setFailed(false)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // Today's notes are a dependency so the recap follows notes added or deleted on this screen.
  }, [open, start, end, notes]);

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
        class="mt-4 flex min-h-11 w-full items-center justify-between rounded-2xl border border-line bg-surface px-5 text-left"
      >
        <span class="font-semibold">Week so far</span>
        <span class="text-sm text-muted">{label} · Show</span>
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
    <section aria-labelledby="recap-title" class="mt-4 rounded-2xl border border-line bg-surface p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 id="recap-title" class="text-lg font-semibold">
          {isRecapDay(today) ? 'Friday recap' : 'Week so far'}
        </h2>
        <span class="text-xs text-muted">
          {label}
          {recap && ` · ${recap.activeDays} ${recap.activeDays === 1 ? 'day' : 'days'}`}
        </span>
      </div>

      {failed && (
        <p role="alert" class="mt-2 text-accent">
          Could not read this week's notes from this device.
        </p>
      )}
      {!recap && !failed && <div class="mt-3 h-16 animate-pulse rounded-xl bg-line/40" aria-label="Loading recap" />}
      {recap && recap.activeDays === 0 && <p class="mt-2 text-muted">No notes this week yet. Your recap fills in as you log.</p>}
      {recap && recap.activeDays > 0 && (
        <div aria-live="polite" class="mt-3 grid gap-3">
          {sections.map(([title, items]) => (
            <div key={title}>
              <h3 class="text-sm font-semibold text-muted">
                {title} · {items.length}
              </h3>
              <ul class="mt-1 list-disc pl-5">
                {items.length > 0 ? items.map((item, i) => <li key={i}>{item}</li>) : <li class="text-muted">None</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(recap?.activeDays || !isRecapDay(today)) && (
        <div class="mt-4 flex gap-2">
          {recap && recap.activeDays > 0 && (
            <button type="button" onClick={copy} class="min-h-11 flex-1 rounded-xl border border-line px-4 text-fg">
              Copy recap
            </button>
          )}
          {!isRecapDay(today) && (
            <button type="button" onClick={() => setOpen(false)} class="min-h-11 rounded-xl border border-line px-4 text-muted">
              Hide
            </button>
          )}
        </div>
      )}
    </section>
  );
}
