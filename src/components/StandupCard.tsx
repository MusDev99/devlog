import { useState } from 'preact/hooks';
import { previousWorkday } from '../lib/db.ts';
import type { Note } from '../lib/notes.ts';
import { formatStandup } from '../lib/standup.ts';
import { buildStandup, loadPasscode, savePasscode, type StandupResult } from '../lib/standup-client.ts';
import { Icon } from './Icon.tsx';

type Props = { today: string; notes: Note[]; online: boolean; onToast: (message: string) => void };

/** Standup on demand. The person reads and copies it; nothing is sent anywhere else. */
export function StandupCard({ today, notes, online, onToast }: Props) {
  const [result, setResult] = useState<StandupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [passcode, setPasscode] = useState(loadPasscode);

  async function generate() {
    setBusy(true);
    try {
      const previous = await previousWorkday(today);
      setResult(await buildStandup(previous, notes, passcode, online));
    } catch {
      onToast('Could not read notes from this device');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatStandup(result.standup));
      onToast('Standup copied');
    } catch {
      onToast('Copy blocked by the browser, select the text instead');
    }
  }

  const sections: [string, string[]][] = result
    ? [
        ['Yesterday', result.standup.yesterday],
        ['Today', result.standup.today],
        ['Blockers', result.standup.blockers],
      ]
    : [];

  return (
    <section aria-labelledby="standup-title" class="rounded-3xl border border-line bg-surface-low p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 id="standup-title" class="flex items-center gap-2 text-[1.375rem] leading-7">
          <Icon name="sparkle" class="size-6 text-primary" />
          Standup
        </h2>
        {result && (
          <span class="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-medium text-muted">
            {result.source === 'ai' ? 'AI' : `Rules · ${result.note ?? ''}`}
          </span>
        )}
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

      <details class="group mt-3 text-sm text-muted">
        <summary class="state-layer -mx-2 flex min-h-11 cursor-pointer list-none items-center justify-between rounded-full px-2 font-medium [&::-webkit-details-marker]:hidden">
          AI settings
          <Icon name="expand" class="size-6 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        {/* Material filled text field: label inside the container, indicator line underneath. */}
        <div class="mt-2 rounded-t-lg border-b border-outline bg-surface-highest px-4 pt-2 pb-1 focus-within:border-b-2 focus-within:border-primary">
          <label for="passcode" class="block text-xs text-muted">
            Passcode (from your Vercel settings)
          </label>
          <input
            id="passcode"
            type="password"
            autoComplete="off"
            value={passcode}
            onChange={(e) => {
              const value = e.currentTarget.value.trim();
              setPasscode(value);
              savePasscode(value);
            }}
            class="min-h-11 w-full bg-transparent text-base text-fg outline-none"
          />
        </div>
        <p class="mt-2 px-4 text-xs leading-5">Only your notes' text and tags are sent to the AI when you tap Build. Without a passcode, standups use tag rules on this phone.</p>
      </details>
    </section>
  );
}
