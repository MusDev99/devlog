import { googlePicture, type User } from './db.ts';

/** What the server says about the person on this device. */
export type SessionState =
  | { status: 'in'; user: User }
  | { status: 'out' }
  /** Sign-in is not set up on this deploy (503), or there is no server (local dev): the app runs local-only. */
  | { status: 'unavailable' }
  | { status: 'offline' };

export const SIGN_IN_URL = '/api/auth/login';

export async function fetchSession(): Promise<SessionState> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin', headers: { accept: 'application/json' } });
    if (res.status === 401) return { status: 'out' };
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return { status: 'unavailable' };
    const body = (await res.json()) as Partial<User>;
    return typeof body.email === 'string'
      ? { status: 'in', user: { email: body.email, name: typeof body.name === 'string' ? body.name : '', picture: googlePicture(body.picture) } }
      : { status: 'unavailable' };
  } catch {
    return { status: 'offline' };
  }
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
}

/** `?signin=denied` after Google: the server never says which check failed (A07), so neither do we. */
export function signInResult(search: string): 'ok' | 'denied' | null {
  const value = new URLSearchParams(search).get('signin');
  return value === 'ok' || value === 'denied' ? value : null;
}
