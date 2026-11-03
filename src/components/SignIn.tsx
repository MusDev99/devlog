import { SIGN_IN_URL } from '../lib/session.ts';
import { Icon } from './Icon.tsx';

export type SignInReason = 'denied' | 'offline' | 'expired' | null;

const MESSAGE: Record<Exclude<SignInReason, null>, string> = {
  denied: "Sign-in didn't go through. Try again, or use another Google account.",
  offline: "You're offline. Connect once to sign in; after that DevLog works offline.",
  expired: 'Your session ended. Sign in again to keep syncing.',
};

/** The sign-in gate: one action, full width in thumb reach (Fitts), with what gets recorded said up front. */
export function SignIn({ reason }: { reason: SignInReason }) {
  return (
    <div class="mode-wash flex min-h-dvh flex-col px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <main class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <img src="/icons/icon.svg" alt="" class="size-16 rounded-2xl" />
        <h1 class="mt-6 text-3xl font-bold tracking-tight">
          Dev<span class="text-accent">Log</span>
        </h1>
        <p class="mt-2 leading-6 text-muted">Time your tasks, sort them by urgency and importance, and keep a record in your team's Google Sheet.</p>

        {reason && (
          <p role="alert" class={`mt-6 rounded-2xl px-4 py-3 text-sm leading-5 ${reason === 'offline' ? 'bg-warn/15 text-warn' : 'bg-error/15 text-error'}`}>
            {MESSAGE[reason]}
          </p>
        )}

        <a
          href={SIGN_IN_URL}
          aria-disabled={reason === 'offline' ? true : undefined}
          class={`press state-layer mt-8 flex min-h-12 items-center justify-center gap-3 rounded-full bg-fg px-6 font-semibold text-bg shadow-lg ${
            reason === 'offline' ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Icon name="google" class="size-5" />
          Continue with Google
        </a>
        <p class="mt-4 text-center text-xs leading-5 text-muted">
          First time? Signing in registers you. Your name and email go in the Users sheet; tasks are recorded as you work.
        </p>
      </main>
    </div>
  );
}
