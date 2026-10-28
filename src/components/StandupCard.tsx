import { useState } from 'preact/hooks';
import { previousWorkday } from '../lib/db.ts';
import type { Note } from '../lib/notes.ts';
import { formatStandup } from '../lib/standup.ts';
import { buildStandup, loadPasscode, savePasscode, type StandupResult } from '../lib/standup-client.ts';

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
    <section aria-labelledby="standup-title" class="mt-4 rounded-2xl border border-line bg-surface p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 id="standup-title" class="text-lg font-semibold">
          Standup
        </h2>
        {result && (
          <span class="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
            {result.source === 'ai' ? 'AI' : `Rules · ${result.note ?? ''}`}
          </span>
        )}
      </div>

      {result ? (
        <div aria-live="polite" class="mt-3 grid gap-3">
          {sections.map(([title, items]) => (
            <div key={title}>
              <h3 class="text-sm font-semibold text-muted">{title}</h3>
              <ul class="mt-1 list-disc pl-5">
                {items.length > 0 ? items.map((item, i) => <li key={i}>{item}</li>) : <li class="text-muted">None</li>}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p class="mt-2 text-muted">Builds yesterday / today / blockers from your last workday and today's notes.</p>
      )}

      <div class="mt-4 flex gap-2">
        {/* Von Restorff: outline buttons here, the composer's Add stays the one filled accent. */}
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          class="min-h-11 flex-1 rounded-xl border border-accent px-4 font-semibold text-accent disabled:opacity-60"
        >
          {busy ? 'Building…' : result ? 'Rebuild' : 'Build standup'}
        </button>
        {result && (
          <button type="button" onClick={copy} class="min-h-11 rounded-xl border border-line px-4 text-fg">
            Copy
          </button>
        )}
      </div>

      <details class="mt-3 text-sm text-muted">
        <summary class="min-h-11 cursor-pointer py-3">AI settings</summary>
        <label for="passcode" class="block">
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
          class="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-fg"
        />
        <p class="mt-1">Only your notes' text and tags are sent to the AI when you tap Build. Without a passcode, standups use tag rules on this phone.</p>
      </details>
    </section>
  );
}
