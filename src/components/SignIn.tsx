import { SIGN_IN_URL } from '../lib/session.ts';
import { Icon, type IconName } from './Icon.tsx';

export type SignInReason = 'denied' | 'offline' | 'expired' | null;

const MESSAGE: Record<Exclude<SignInReason, null>, string> = {
  denied: "Sign-in didn't go through. Try again, or use another Google account.",
  offline: "You're offline. Connect once to sign in; after that DevLog works offline.",
  expired: 'Your session ended. Sign in again to keep syncing.',
};

const FEATURES: { icon: IconName; tone: string; title: string; text: string }[] = [
  { icon: 'do', tone: 'bg-error/15 text-error', title: 'Prioritise', text: 'Urgent × important matrix' },
  { icon: 'timer', tone: 'bg-live/15 text-live', title: 'Track time', text: 'Actual vs span, pauses counted' },
  { icon: 'chart', tone: 'bg-warn/15 text-warn', title: 'See progress', text: 'Targets, streaks, insights' },
  { icon: 'online', tone: 'bg-ok/15 text-ok', title: 'Stay in sync', text: "Recorded in your team's sheet" },
];

/**
 * The sign-in gate, as a landing page: an animated product story on one side (what you get), one clear
 * action on the other (Von Restorff), and what gets recorded said up front. All motion is CSS on
 * transform / opacity, and stops on the finished scene for people who prefer reduced motion.
 */
export function SignIn({ reason }: { reason: SignInReason }) {
  return (
    <div class="relative min-h-dvh overflow-hidden bg-bg">
      <Backdrop />
      <div class="relative mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-5 pt-[max(20px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* The stage is scaled, so this box sets the real height (smaller on phones to keep the button in view). */}
        <div class="order-first flex h-[236px] items-center justify-center sm:h-[312px] lg:order-last lg:h-[360px]">
          <Showcase />
        </div>

        <main class="mx-auto flex w-full max-w-md animate-rise flex-col lg:mx-0">
          <div class="flex items-center gap-3">
            <img src="/icons/icon.svg" alt="" class="size-11 rounded-xl shadow-lg" />
            <p class="text-xl font-bold tracking-tight">
              Dev<span class="text-accent">Log</span>
            </p>
          </div>

          <h1 class="mt-5 text-[2.25rem] leading-[1.05] font-bold tracking-tight sm:mt-7 sm:text-5xl">
            Plan what matters.
            <span class="block bg-linear-to-r from-primary via-warn to-live bg-clip-text text-transparent">Time what you do.</span>
          </h1>
          <p class="mt-4 max-w-sm leading-6 text-muted">
            Sort tasks by urgency and importance, time them with one tap, and keep a clean record in your team's Google Sheet.
          </p>

          {/* Phones: the action comes right after the pitch (thumb reach); the details follow. */}
          <ul class="order-last mt-7 grid grid-cols-2 gap-2.5 lg:order-none">
            {FEATURES.map((f) => (
              <li key={f.title} class="flex items-start gap-2.5 rounded-2xl border border-line/60 bg-surface/60 p-3 backdrop-blur">
                <span class={`grid size-8 shrink-0 place-items-center rounded-lg ${f.tone}`}>
                  <Icon name={f.icon} class="size-[18px]" />
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold">{f.title}</span>
                  <span class="block text-xs leading-4 text-muted">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>

          {reason && (
            <p role="alert" class={`mt-6 rounded-2xl px-4 py-3 text-sm leading-5 ${reason === 'offline' ? 'bg-warn/15 text-warn' : 'bg-error/15 text-error'}`}>
              {MESSAGE[reason]}
            </p>
          )}

          <a
            href={SIGN_IN_URL}
            aria-disabled={reason === 'offline' ? true : undefined}
            class={`press group mt-7 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-fg px-6 text-base font-semibold text-bg shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--color-primary)_60%,transparent)] transition-shadow hover:shadow-[0_14px_50px_-8px_color-mix(in_oklab,var(--color-primary)_75%,transparent)] ${
              reason === 'offline' ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <GoogleG />
            Continue with Google
            <Icon name="arrow" class="size-5 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
          <p class="mt-4 text-center text-xs leading-5 text-muted">
            First time? Signing in registers you. Your name, email and photo go to the Users sheet; tasks are recorded as you work.
          </p>
        </main>
      </div>
    </div>
  );
}

/** Slow-drifting colour fields and a faint dot grid: depth without distraction. */
function Backdrop() {
  return (
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <div class="absolute -top-40 -left-32 size-[30rem] animate-drift rounded-full bg-primary/25 blur-3xl" />
      <div class="absolute top-1/4 -right-40 size-[28rem] animate-drift rounded-full bg-live/20 blur-3xl [animation-delay:-7s]" />
      <div class="absolute -bottom-48 left-1/4 size-[32rem] animate-drift rounded-full bg-google-blue/15 blur-3xl [animation-delay:-14s]" />
      <div class="absolute inset-0 bg-[radial-gradient(var(--color-line)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-size-[22px_22px] opacity-60" />
    </div>
  );
}

/** One task card that lands in Unsorted and then moves into its quadrant. */
function Card({ text, x, tx, ty, delay, dot }: { text: string; x: number; tx: number; ty: number; delay: string; dot: string }) {
  return (
    <div
      class="absolute top-[40px] flex h-[20px] w-[96px] animate-settle items-center gap-1.5 rounded-md bg-surface-highest px-1.5 text-[9px] font-medium shadow-md"
      style={{ left: `${x}px`, '--tx': `${tx}px`, '--ty': `${ty}px`, animationDelay: delay }}
    >
      <span class={`size-1.5 shrink-0 rounded-full ${dot}`} />
      <span class="truncate">{text}</span>
    </div>
  );
}

const QUADS: { name: string; tint: string; text: string; x: number; y: number }[] = [
  { name: 'Q1 Do now', tint: 'bg-error/10', text: 'text-error', x: 10, y: 70 },
  { name: 'Q2 Schedule', tint: 'bg-ok/10', text: 'text-ok', x: 164, y: 70 },
  { name: 'Q3 Delegate', tint: 'bg-warn/10', text: 'text-warn', x: 10, y: 120 },
  { name: 'Q4 Drop', tint: 'bg-outline/10', text: 'text-muted', x: 164, y: 120 },
];
const BARS = [32, 54, 41, 70, 48, 84, 100];
const RING = 2 * Math.PI * 18;

/** The animated product story: tasks get sorted, the clock fills, points are scored, the week grows, it syncs. */
function Showcase() {
  return (
    <div aria-hidden="true" class="relative h-[312px] w-[340px] shrink-0 origin-center scale-[0.74] select-none sm:scale-100 lg:scale-110">
      <div class="absolute top-[28px] left-[10px] h-[240px] w-[320px] animate-bob overflow-hidden rounded-2xl border border-line/70 bg-surface/90 shadow-2xl shadow-black/40 backdrop-blur">
        <div class="flex h-[26px] items-center gap-1.5 border-b border-line/60 px-3">
          <span class="size-2 rounded-full bg-error/70" />
          <span class="size-2 rounded-full bg-warn/70" />
          <span class="size-2 rounded-full bg-ok/70" />
          <span class="ml-2 text-[10px] font-semibold text-muted">DevLog · Tasks</span>
        </div>
        <div class="absolute top-[34px] right-[10px] left-[10px] h-[28px] rounded-lg border border-dashed border-line" />
        <span class="absolute top-[24px] right-[14px] text-[8px] text-muted">Unsorted</span>
        {QUADS.map((q) => (
          <div key={q.name} class={`absolute h-[46px] w-[146px] rounded-lg ${q.tint}`} style={{ left: `${q.x}px`, top: `${q.y}px` }}>
            <span class={`absolute top-1 left-1.5 text-[8px] font-semibold ${q.text}`}>{q.name}</span>
          </div>
        ))}
        <Card text="Fix checkout bug" x={14} tx={4} ty={44} delay="0s" dot="bg-error" />
        <Card text="Plan Q3 roadmap" x={114} tx={58} ty={44} delay="0.5s" dot="bg-ok" />
        <Card text="Vendor reply" x={214} tx={-196} ty={94} delay="1s" dot="bg-warn" />
        <div class="absolute right-[12px] bottom-[10px] left-[12px] flex h-[52px] items-end gap-2">
          {BARS.map((h, i) => (
            <span
              key={i}
              class={`flex-1 origin-bottom animate-bar rounded-t-[3px] ${i === BARS.length - 1 ? 'bg-ok' : 'bg-primary/60'}`}
              style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
      </div>

      <div class="absolute bottom-[4px] -left-[6px] flex animate-bob items-center gap-2.5 rounded-2xl border border-line/70 bg-surface-high/95 py-2 pr-3.5 pl-2 shadow-xl [animation-delay:-2s]">
        <svg viewBox="0 0 44 44" class="size-11 -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke-width="4" class="stroke-surface-highest" />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray={RING}
            class="animate-ring stroke-live"
            style={{ '--ring-from': `${RING}`, '--ring-to': `${RING * 0.25}` }}
          />
        </svg>
        <span>
          <span class="block text-sm font-bold tabular-nums">1h 30m</span>
          <span class="block text-[10px] text-muted">actual · span 2h</span>
        </span>
      </div>

      <div class="absolute top-[6px] right-[2px] flex animate-badge items-center gap-1 rounded-full bg-ok px-3 py-1 text-xs font-bold text-bg shadow-lg">
        <Icon name="check" class="size-3.5" />
        +3 SP
      </div>

      <div class="absolute right-[-4px] bottom-[22px] flex animate-bob items-center gap-1.5 rounded-full border border-line/70 bg-surface-high/95 px-3 py-1.5 text-[11px] font-medium shadow-xl [animation-delay:-4s]">
        <Icon name="online" class="size-4 text-ok" />
        Synced to Google Sheets
      </div>
    </div>
  );
}

/** The official multi-colour Google "G" (brand colours are tokens in styles.css). */
function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5">
      <path class="fill-google-blue" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path class="fill-google-green" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path class="fill-google-yellow" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path class="fill-google-red" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}
