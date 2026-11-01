import { useState } from 'preact/hooks';
import { previousWorkday } from '../lib/db.ts';
import type { Note } from '../lib/notes.ts';
import { formatStandup, ruleStandup, type Standup } from '../lib/standup.ts';
import { Icon } from './Icon.tsx';

type Props = { today: string; notes: Note[]; onToast: (message: string) => void };

/** Standup on demand, built on this phone from tags. Nothing is sent anywhere. */
export function StandupCard({ today, notes, onToast }: Props) {
  const [result, setResult] = useState<Standup | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const previous = await previousWorkday(today);
      setResult(ruleStandup(previous, notes));
    } catch {
      onToast('Could not read notes from this device');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatStandup(result));
      onToast('Standup copied');
    } catch {
      onToast('Copy blocked by the browser, select the text instead');
    }
  }

  const sections: [string, string[]][] = result
    ? [
        ['Yesterday', result.yesterday],
        ['Today', result.today],
        ['Blockers', result.blockers],
      ]
    : [];

  return (
    <section aria-labelledby="standup-title" class="rounded-3xl border border-line bg-surface-low p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 id="standup-title" class="flex items-center gap-2 text-[1.375rem] leading-7">
          <Icon name="sparkle" class="size-6 text-primary" />
          Standup
        </h2>
      </div>

      {result ? (
        <div aria-live="polite" class="mt-4 grid gap-4">
          {sections.map(([title, items]) => (
            <div key={title}>
              <h3 class="text-sm font-medium tracking-wide text-primary">{title}</h3>
              <ul class="mt-1 list-disc pl-5 leading-6 marker:text-outline">
                {items.length > 0 ? items.map((item, i) => <li key={i}>{item}</li>) : <li class="text-muted">None</li>}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p class="mt-3 leading-6 text-muted">Builds yesterday / today / blockers from your last workday and today's notes.</p>
      )}

      <div class="mt-5 flex gap-2">
        {/* Von Restorff: tonal and text buttons here, the composer's Add stays the one filled primary. */}
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          class="state-layer inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary-container px-6 text-sm font-medium text-on-primary-container disabled:opacity-60"
        >
          <Icon name={result ? 'refresh' : 'sparkle'} class="size-[18px]" />
          {busy ? 'Building…' : result ? 'Rebuild' : 'Build standup'}
        </button>
        {result && (
          <button
            type="button"
            onClick={copy}
            class="state-layer inline-flex min-h-11 items-center gap-2 rounded-full border border-outline px-5 text-sm font-medium text-primary"
          >
            <Icon name="copy" class="size-[18px]" />
            Copy
          </button>
        )}
      </div>

      <p class="mt-3 text-xs leading-5 text-muted">Built on this phone from your tags. No AI, nothing leaves the device.</p>
    </section>
  );
}
