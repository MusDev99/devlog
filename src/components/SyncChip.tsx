import { SIGN_IN_URL } from '../lib/session.ts';
import type { SyncStatus } from '../lib/use-sync.ts';
import { Icon, type IconName } from './Icon.tsx';

/** Where the Google Sheet record stands, always as icon + words (never colour alone). Compact on phones. */
const LOOK: Record<Exclude<SyncStatus['state'], 'off' | 'idle'>, { icon: IconName; tone: string; label: (n: number) => string }> = {
  synced: { icon: 'online', tone: 'text-ok', label: () => 'Synced' },
  syncing: { icon: 'refresh', tone: 'text-live', label: () => 'Syncing…' },
  waiting: { icon: 'offline', tone: 'text-warn', label: (n) => `Offline · ${n} waiting` },
  error: { icon: 'refresh', tone: 'text-error', label: (n) => `${n} not synced · Retry` },
  'signed-out': { icon: 'offline', tone: 'text-error', label: () => 'Sign in again to sync' },
  unavailable: { icon: 'offline', tone: 'text-muted', label: () => 'Sheet not set up' },
};

export function SyncChip({ status, onRetry }: { status: SyncStatus; onRetry: () => void }) {
  if (status.state === 'off' || status.state === 'idle') return null;
  const look = LOOK[status.state];
  const text = look.label(status.waiting);
  const body = (
    <>
      <Icon name={look.icon} class={`size-[18px] ${status.state === 'syncing' ? 'animate-spin' : ''}`} />
      <span class="hidden sm:inline">{text}</span>
      {status.waiting > 0 && status.state !== 'syncing' && <span class="text-xs font-bold tabular-nums sm:hidden">{status.waiting}</span>}
    </>
  );
  const chip = `press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-high px-3 text-sm font-medium ${look.tone}`;
  if (status.state === 'error')
    return (
      <button type="button" onClick={onRetry} aria-label={text} title={text} class={`state-layer ${chip}`}>
        {body}
      </button>
    );
  if (status.state === 'signed-out')
    return (
      <a href={SIGN_IN_URL} aria-label={text} title={text} class={`state-layer ${chip}`}>
        {body}
      </a>
    );
  return (
    <span role="status" aria-label={text} title={text} class={chip}>
      {body}
    </span>
  );
}
