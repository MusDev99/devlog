import { useEffect, useRef, useState } from 'preact/hooks';
import type { User } from '../lib/db.ts';
import { formatMinutes } from '../lib/stats.ts';
import { DEFAULT_TARGETS, TARGET_LIMITS, type Targets } from '../lib/targets.ts';
import { Avatar } from './Avatar.tsx';
import { Icon } from './Icon.tsx';

type Props = { open: boolean; user: User | null; onSignOut: () => void; targets: Targets; onSave: (targets: Targets) => void; onClose: () => void };

const FIELDS: { key: keyof Targets; label: string; hint: string; show: (v: number) => string }[] = [
  { key: 'tasks', label: 'Tasks to finish', hint: 'per day', show: (v) => String(v) },
  { key: 'points', label: 'Story points', hint: 'per day, finished', show: (v) => `${v} SP` },
  { key: 'minutes', label: 'Focus time', hint: 'per day, timed', show: (v) => formatMinutes(v * 60_000) },
];

/** Daily targets. A native modal dialog: focus is trapped, Esc closes, the page behind is inert. */
export function SettingsDialog({ open, user, onSignOut, targets, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(targets);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft(targets);
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  const step = (key: keyof Targets, dir: 1 | -1) => {
    const [min, max, by] = TARGET_LIMITS[key];
    setDraft((d) => ({ ...d, [key]: Math.min(max, Math.max(min, d[key] + dir * by)) }));
  };
  const round = 'press state-layer grid size-11 shrink-0 place-items-center rounded-full bg-surface-highest disabled:opacity-40';

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="settings-title"
      class="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[28px] border border-line/70 bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form
        method="dialog"
        class="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        <div class="flex items-center justify-between gap-2">
          <h2 id="settings-title" class="text-lg font-semibold">
            Settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" class="press state-layer grid size-11 place-items-center rounded-full text-muted">
            <Icon name="close" class="size-5" />
          </button>
        </div>
        <p class="mt-1 text-sm text-muted">
          Daily targets: stats, rings and streaks measure each day against these.{' '}
          {user ? 'Saved to your profile, so they follow you to every device.' : 'Saved on this device.'}
        </p>


        <ul class="mt-5 grid gap-3">
          {FIELDS.map(({ key, label, hint, show }) => {
            const [min, max] = TARGET_LIMITS[key];
            return (
              <li key={key} class="flex items-center gap-3 rounded-2xl bg-surface-high px-3.5 py-2.5">
                <div class="min-w-0 flex-1">
                  <p class="font-medium">{label}</p>
                  <p class="text-xs text-muted">{hint}</p>
                </div>
                <button type="button" onClick={() => step(key, -1)} disabled={draft[key] <= min} aria-label={`Less ${label.toLowerCase()}`} class={round}>
                  <Icon name="minus" class="size-5" />
                </button>
                <output aria-live="polite" class="w-[4.5rem] text-center text-base font-semibold whitespace-nowrap tabular-nums sm:text-lg">
                  {show(draft[key])}
                </output>
                <button type="button" onClick={() => step(key, 1)} disabled={draft[key] >= max} aria-label={`More ${label.toLowerCase()}`} class={round}>
                  <Icon name="add" class="size-5" />
                </button>
              </li>
            );
          })}
        </ul>

        <div class="mt-5 flex items-center gap-3 rounded-2xl bg-surface-high px-3.5 py-2.5">
          {user ? (
            <>
              <Avatar user={user} size="size-10" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{user.name || user.email}</p>
                <p class="truncate text-xs text-muted">{user.email} · tasks and targets sync to the team sheet</p>
              </div>
              <button type="button" onClick={onSignOut} class="press state-layer inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-error">
                <Icon name="logout" class="size-[18px]" />
                Sign out
              </button>
            </>
          ) : (
            <p class="text-sm text-muted">Local only: sign-in is not set up on this deploy, so nothing syncs.</p>
          )}
        </div>

        <div class="mt-6 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setDraft(DEFAULT_TARGETS)} class="press state-layer min-h-11 rounded-full px-3 text-sm font-medium text-muted hover:text-fg">
            Reset defaults
          </button>
          <div class="flex gap-2">
            <button type="button" onClick={onClose} class="press state-layer min-h-11 rounded-full px-4 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" class="press state-layer min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent">
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
