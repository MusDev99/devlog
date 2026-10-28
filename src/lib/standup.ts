import type { Note, Tag } from './notes.ts';

/** Standup rules shared by the browser (rule-based fallback) and the AI function (grounding). Pure. */

export type Standup = { yesterday: string[]; today: string[]; blockers: string[] };
export type StandupSource = 'ai' | 'rules';

/** What is sent to the AI: notes get short refs (N1, N2…) so every output item can cite its source. */
export type PromptNote = { ref: string; tag: Tag; when: 'previous' | 'today'; text: string };
export type ModelItem = { text: string; refs: string[] };
export type ModelStandup = { yesterday: ModelItem[]; today: ModelItem[]; blockers: ModelItem[] };

export const MAX_PROMPT_NOTES = 60;
export const MAX_PROMPT_CHARS = 4000;

const unique = (items: string[]) => [...new Set(items)];

/** Deterministic standup from tags: always available, offline included. */
export function ruleStandup(previous: Note[], current: Note[]): Standup {
  const texts = (notes: Note[], ...tags: Tag[]) => notes.filter((n) => tags.includes(n.tag)).map((n) => n.text);
  const todayWork = texts(current, 'done', 'doing');
  return {
    yesterday: unique(texts(previous, 'done', 'doing')),
    today: unique(todayWork.length > 0 ? todayWork : texts(previous, 'doing')),
    blockers: unique([...texts(previous, 'blocker'), ...texts(current, 'blocker')]),
  };
}

export function toPromptNotes(previous: Note[], current: Note[]): PromptNote[] {
  const byTime = (a: Note, b: Note) => a.createdAt.localeCompare(b.createdAt);
  const rows = [
    ...[...previous].sort(byTime).map((n) => ({ tag: n.tag, when: 'previous' as const, text: n.text })),
    ...[...current].sort(byTime).map((n) => ({ tag: n.tag, when: 'today' as const, text: n.text })),
  ];
  return rows.map((row, i) => ({ ref: `N${i + 1}`, ...row }));
}

export function promptSize(notes: PromptNote[]): number {
  return notes.reduce((sum, n) => sum + n.text.length, 0);
}

/**
 * Guardrail on model output: keep only items that cite real notes (no invented work), require
 * blockers to cite a blocker note, and add back any blocker note the model left out.
 */
export function groundStandup(model: ModelStandup, notes: PromptNote[]): { standup: Standup; dropped: number } {
  const byRef = new Map(notes.map((n) => [n.ref, n]));
  let dropped = 0;
  const keep = (items: ModelItem[], ok: (n: PromptNote) => boolean) =>
    items.flatMap((item) => {
      const text = item.text.trim();
      const cited = item.refs.map((r) => byRef.get(r));
      if (!text || cited.length === 0 || cited.some((n) => !n || !ok(n))) {
        dropped += 1;
        return [];
      }
      return [{ text, refs: item.refs }];
    });

  const yesterday = keep(model.yesterday, (n) => n.tag !== 'blocker');
  const today = keep(model.today, (n) => n.tag !== 'blocker');
  const blockers = keep(model.blockers, (n) => n.tag === 'blocker');
  const covered = new Set(blockers.flatMap((b) => b.refs));
  const missing = notes.filter((n) => n.tag === 'blocker' && !covered.has(n.ref)).map((n) => n.text);

  return {
    standup: {
      yesterday: yesterday.map((i) => i.text),
      today: today.map((i) => i.text),
      blockers: [...blockers.map((i) => i.text), ...missing],
    },
    dropped,
  };
}

export function formatStandup(s: Standup): string {
  const section = (title: string, items: string[]) =>
    `${title}\n${items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '- None'}`;
  return [section('Yesterday', s.yesterday), section('Today', s.today), section('Blockers', s.blockers)].join('\n\n');
}

export function isStandup(value: unknown): value is Standup {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const list = (x: unknown) => Array.isArray(x) && x.every((i) => typeof i === 'string');
  return list(v.yesterday) && list(v.today) && list(v.blockers);
}
