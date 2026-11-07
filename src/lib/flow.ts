import { MAX_NOTE_LENGTH, parseDraft, SIZES, validateDraft, type Draft, type Place, type Size } from './notes.ts';

/**
 * The guided "New activity" flow: one question per screen. Pure rules only (what a step asks, what stops it
 * moving on, how the answers become a task); the screens are in `components/NewActivity.tsx`.
 */

export type FlowStepId = 'title' | 'link' | 'size' | 'place';
export type FlowStep = { id: FlowStepId; question: string; hint: string; skippable: boolean };

/** In order. Only the title is required; every other step can be skipped (a skipped size counts as 1, a skipped place stays Unsorted). */
export const FLOW_STEPS: readonly [FlowStep, ...FlowStep[]] = [
  { id: 'title', question: 'What are you working on?', hint: 'A few words is enough.', skippable: false },
  { id: 'link', question: 'Is there a ticket or pull request?', hint: 'Paste a Jira or GitHub link, or skip.', skippable: true },
  { id: 'size', question: 'How big is it?', hint: 'Story points. Skip and it counts as 1.', skippable: true },
  { id: 'place', question: 'Where does it belong?', hint: 'Pick a quadrant, or leave it unsorted for now.', skippable: true },
];

/** What the person has answered so far. `size` is null until one is chosen. */
export type FlowDraft = { title: string; link: string; size: Size | null; place: Place };

export const emptyFlowDraft = (): FlowDraft => ({ title: '', link: '', size: null, place: 'unsorted' });

/** The link field: blank is fine (no link); an http(s):// or www. address is kept as typed; anything else is not a link. */
export function normalizeLink(input: string): { ok: boolean; href: string } {
  const raw = input.trim();
  if (!raw) return { ok: true, href: '' };
  const href = /^www\./i.test(raw) ? `https://${raw}` : raw;
  if (/\s/.test(href) || !/^https?:\/\//i.test(href)) return { ok: false, href: '' };
  try {
    return new URL(href).hostname.includes('.') ? { ok: true, href } : { ok: false, href: '' };
  } catch {
    return { ok: false, href: '' };
  }
}

/** The task text from a title and an optional link, or an error the screen can show. */
export function composeText(title: string, href: string, max = MAX_NOTE_LENGTH): { text: string; error: string } {
  const t = title.replace(/\s+/g, ' ').trim();
  if (!t) return { text: '', error: 'Give the activity a name.' };
  const text = href ? `${t} ${href}` : t;
  if (text.length > max) return { text: '', error: `That is ${text.length - max} characters too long. Shorten the title${href ? ' or the link' : ''}.` };
  return { text, error: '' };
}

/** Why a step cannot move on yet, or '' when it can. Size and place never block. */
export function flowStepError(step: FlowStepId, draft: FlowDraft): string {
  if (step === 'title') return composeText(draft.title, '').error;
  if (step === 'link') {
    const link = normalizeLink(draft.link);
    if (!link.ok) return 'That does not look like a link. Start it with https:// or skip this step.';
    return composeText(draft.title, link.href).error;
  }
  return '';
}

export type FlowResult = { ok: true; draft: Draft; size: Size; place: Place } | { ok: false; error: string; step: FlowStepId };

/**
 * The finished answers as what the app saves: a draft (the `wip:` / `b:` / `done:` prefixes still set a status, as in
 * the quick add), a size and a place. When something does not fit, the step that can fix it.
 */
export function flowResult(draft: FlowDraft): FlowResult {
  const link = normalizeLink(draft.link);
  if (!link.ok) return { ok: false, error: flowStepError('link', draft), step: 'link' };
  const composed = composeText(draft.title, link.href);
  if (composed.error) return { ok: false, error: composed.error, step: 'title' }; // the title is always there to shorten
  const parsed = parseDraft(composed.text, 'todo');
  const problem = validateDraft(parsed);
  if (problem) return { ok: false, error: problem, step: 'title' };
  return { ok: true, draft: parsed, size: draft.size !== null && SIZES.includes(draft.size) ? draft.size : 1, place: draft.place };
}
