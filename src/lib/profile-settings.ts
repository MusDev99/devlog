import { isJiraBase } from './jira.ts';
import { isTargets, type Targets } from './targets.ts';

/** The signed-in person's settings in their Users row (via /api/settings). */
export type RemoteTargets = { status: 'ok'; targets: Targets | null } | { status: 'unavailable' };

export async function fetchRemoteTargets(): Promise<RemoteTargets> {
  try {
    const res = await fetch('/api/settings', { credentials: 'same-origin', headers: { accept: 'application/json' } });
    if (!res.ok) return { status: 'unavailable' };
    const body = (await res.json()) as { targets?: unknown };
    return { status: 'ok', targets: isTargets(body.targets) ? body.targets : null };
  } catch {
    return { status: 'unavailable' };
  }
}

/** True when the sheet accepted them. */
export async function pushTargets(targets: Targets): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targets }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const sameTargets = (a: Targets, b: Targets) => a.tasks === b.tasks && a.points === b.points && a.minutes === b.minutes;

/** The person's Jira site from their Users row ('' = none saved). */
export type RemoteJira = { status: 'ok'; jira: string } | { status: 'unavailable' };

export async function fetchRemoteJira(): Promise<RemoteJira> {
  try {
    const res = await fetch('/api/jira', { credentials: 'same-origin', headers: { accept: 'application/json' } });
    if (!res.ok) return { status: 'unavailable' };
    const body = (await res.json()) as { jira?: unknown };
    return { status: 'ok', jira: isJiraBase(body.jira) ? body.jira : '' };
  } catch {
    return { status: 'unavailable' };
  }
}

/** True when the sheet accepted it. `jira` is '' (clear) or an https origin. */
export async function pushJira(jira: string): Promise<boolean> {
  try {
    const res = await fetch('/api/jira', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jira }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
