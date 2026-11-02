import { useEffect, useState } from 'preact/hooks';
import { isIos } from './launch.ts';

/** Chrome / Edge / Samsung install prompt (not in the TS DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Badging API on installed apps (Chrome, Edge, Safari 16.4+); optional everywhere else. */
type BadgeNavigator = Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void>; standalone?: boolean };

const changed = new Set<() => void>();
const notify = () => changed.forEach((listener) => listener());

let installEvent: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let updateRequested = false;

/** Catch the install prompt early: it can fire before the app renders. */
export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    notify();
  });
}

/**
 * Registers the service worker in production builds only (dev keeps hot reload predictable).
 * A new version waits until the app says go (see `useUpdate`), then the page reloads once.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const offer = (worker: ServiceWorker) => {
        waitingWorker = worker;
        notify();
      };
      if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
        });
      });
      // An installed app can stay open for days: look for a new version each time it comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateRequested) location.reload();
      });
    } catch (error: unknown) {
      console.error('Service worker registration failed', error);
    }
  });
}

function useChanges(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    changed.add(listener);
    return () => void changed.delete(listener);
  }, []);
}

/** Running as an installed app (home screen / desktop window). */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as BadgeNavigator).standalone === true;
}

/** Install: the browser prompt where there is one; on iPhone / iPad (no prompt) a hint to use Share → Add to Home Screen. */
export function useInstall(): { canInstall: boolean; install: () => Promise<void>; iosHint: boolean } {
  useChanges();
  return {
    canInstall: installEvent !== null,
    install: async () => {
      const event = installEvent;
      if (!event) return;
      await event.prompt();
      await event.userChoice;
      installEvent = null;
      notify();
    },
    iosHint: !isStandalone() && isIos(navigator.userAgent, navigator.maxTouchPoints),
  };
}

/** A new version is installed and waiting: `apply` swaps it in and reloads. Null when up to date. */
export function useUpdate(): (() => void) | null {
  useChanges();
  const worker = waitingWorker;
  if (!worker) return null;
  return () => {
    updateRequested = true;
    worker.postMessage('skip-waiting');
  };
}

/** Number on the home-screen icon (open tasks); cleared at 0. Silently skipped where unsupported. */
export function setBadge(count: number): void {
  const nav = navigator as BadgeNavigator;
  const done = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
  done?.catch(() => undefined);
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
