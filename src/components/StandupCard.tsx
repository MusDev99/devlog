import { useEffect, useState } from 'preact/hooks';
import { previousWorkday } from '../lib/db.ts';
import type { Note } from '../lib/notes.ts';
import { formatStandup } from '../lib/standup.ts';
import { buildStandup, fetchSession, signOut, type StandupResult } from '../lib/standup-client.ts';
import { Icon } from './Icon.tsx';

type Props = { today: string; notes: Note[]; online: boolean; onToast: (message: string) => void };

/** Standup on demand. The person reads and copies it; nothing is sent anywhere else. */
export function StandupCard({ today, notes, online, onToast }: Props) {
  const [result, setResult] = useState<StandupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    if (online) fetchSession().then(setAccount);
  }, [online]);

  async function generate() {
    setBusy(true);
    try {
      const previous = await previousWorkday(today);
      setResult(await buildStandup(previous, notes, account !== null, online));
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

      {/* Account line: a Material list row with a text button as its trailing action. */}
      <div class="mt-3 flex min-h-11 items-center justify-between gap-2 text-sm text-muted">
        {account ? (
          <>
            <span class="min-w-0 truncate">AI on · {account}</span>
            <button
              type="button"
              class="state-layer min-h-11 shrink-0 rounded-full px-3 font-medium text-primary"
              onClick={async () => {
                await signOut().catch(() => undefined);
                setAccount(null);
                onToast('Signed out of AI');
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <span>AI off · rules on this phone</span>
            {online && (
              <a href="/api/auth/login" class="state-layer flex min-h-11 shrink-0 items-center rounded-full px-3 font-medium text-primary">
                Sign in with Google
              </a>
            )}
          </>
        )}
      </div>
      <p class="mt-1 text-xs leading-5 text-muted">Only today's and the last workday's note text and tags are sent, and only when you tap Build.</p>
    </section>
  );
}
