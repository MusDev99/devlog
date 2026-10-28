import { dayLabel, greeting } from './lib/today.ts';
import { useOnline } from './lib/pwa.ts';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Week 1 shell: header, connection status and the empty state. Capture arrives in Week 2. */
export function App() {
  const online = useOnline();
  const now = new Date();

  return (
    <div class="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <header class="flex items-start justify-between gap-4 py-4">
        <div>
          <p class="text-sm text-muted">{dayLabel(now, timeZone)}</p>
          <h1 class="text-2xl font-bold tracking-tight">{greeting(now, timeZone)}</h1>
        </div>
        {/* Never colour alone: the status pill always carries text. */}
        <span
          role="status"
          class={`mt-1 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs ${online ? 'text-ok' : 'text-warn'}`}
        >
          <span aria-hidden="true" class={`size-2 rounded-full ${online ? 'bg-ok' : 'bg-warn'}`} />
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      <main class="flex flex-1 flex-col">
        <section aria-labelledby="today-title" class="rounded-2xl border border-line bg-surface p-5">
          <h2 id="today-title" class="text-lg font-semibold">Today</h2>
          <p class="mt-2 text-muted">
            No notes yet. Quick notes tagged <b class="text-fg">done</b>, <b class="text-fg">doing</b> and{' '}
            <b class="text-fg">blocker</b> land here, saved on this phone, even offline.
          </p>
        </section>

        <section aria-labelledby="standup-title" class="mt-4 rounded-2xl border border-dashed border-line p-5">
          <h2 id="standup-title" class="text-lg font-semibold">Standup</h2>
          <p class="mt-2 text-muted">Your AI standup (yesterday, today, blockers) appears here once you have notes.</p>
        </section>
      </main>

      <footer class="pt-6 text-center text-xs text-muted">DevLog v{__APP_VERSION__} · notes stay on this device</footer>
    </div>
  );
}
