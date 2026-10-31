import type { Note } from './notes.ts';
import { isStandup, MAX_PROMPT_CHARS, promptSize, ruleStandup, toPromptNotes, type Standup, type StandupSource } from './standup.ts';

export type StandupResult = { standup: Standup; source: StandupSource; note?: string };

/** Who is signed in for AI, or null. Offline or unconfigured counts as signed out. */
export async function fetchSession(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { email?: unknown };
    return typeof body.email === 'string' ? body.email : null;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' });
}

const REASONS: Record<number, string> = {
  401: 'sign in again to use AI',
  413: 'too many notes for AI',
  429: 'AI is busy, try again in a minute',
  503: 'AI is not set up on the server',
};

/** AI standup when possible; any failure falls back to the tag rules with a visible reason. */
export async function buildStandup(previous: Note[], current: Note[], signedIn: boolean, online: boolean): Promise<StandupResult> {
  const rules = (note: string): StandupResult => ({ standup: ruleStandup(previous, current), source: 'rules', note });
  const notes = toPromptNotes(previous, current);
  if (!online) return rules('offline');
  if (!signedIn) return rules('sign in to use AI');
  if (promptSize(notes) > MAX_PROMPT_CHARS) return rules(REASONS[413] ?? '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch('/api/standup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ notes }),
      signal: controller.signal,
    });
    if (!res.ok) return rules(REASONS[res.status] ?? 'AI unavailable');
    const body: unknown = await res.json();
    const standup = (body as { standup?: unknown }).standup;
    return isStandup(standup) ? { standup, source: 'ai' } : rules('AI reply was not usable');
  } catch {
    return rules(controller.signal.aborted ? 'AI took too long' : 'AI unavailable');
  } finally {
    clearTimeout(timer);
  }
}
