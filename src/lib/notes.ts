/** Pure note rules: no storage, no clock. Shared by the UI and (Week 3) the standup builder. */

export const TAGS = ['done', 'doing', 'blocker'] as const;
export type Tag = (typeof TAGS)[number];

export const TAG_LABELS: Record<Tag, string> = { done: 'Done', doing: 'Doing', blocker: 'Blocker' };

export const MAX_NOTE_LENGTH = 500;

export type Note = {
  id: string;
  text: string;
  tag: Tag;
  /** ISO 8601 UTC. */
  createdAt: string;
  /** `YYYY-MM-DD` in the user's zone when written: the day the note belongs to. */
  day: string;
};

export type Draft = { text: string; tag: Tag };

/** Postel: accept "blocker: waiting on infra" or "b: ..." and lift the prefix into the tag. */
const PREFIXES: [RegExp, Tag][] = [
  [/^(done|d)\s*:\s*/i, 'done'],
  [/^(doing|wip|todo|t)\s*:\s*/i, 'doing'],
  [/^(blocker|blocked|b)\s*:\s*/i, 'blocker'],
];

export function parseDraft(raw: string, fallback: Tag): Draft {
  const text = raw.replace(/\s+/g, ' ').trim();
  for (const [re, tag] of PREFIXES) {
    if (re.test(text)) return { text: text.replace(re, ''), tag };
  }
  return { text, tag: fallback };
}

export function validateDraft(draft: Draft): string | null {
  if (!draft.text) return 'Write something first.';
  if (draft.text.length > MAX_NOTE_LENGTH) return `Keep it under ${MAX_NOTE_LENGTH} characters (${draft.text.length} now).`;
  if (!TAGS.includes(draft.tag)) return 'Pick done, doing or blocker.';
  return null;
}

export function groupByTag(notes: Note[]): Record<Tag, Note[]> {
  const groups: Record<Tag, Note[]> = { done: [], doing: [], blocker: [] };
  for (const note of [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) groups[note.tag].push(note);
  return groups;
}

/** Runtime guard for rows read back from IndexedDB (old or corrupt rows are skipped, never crash). */
export function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.text === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.day === 'string' &&
    TAGS.includes(v.tag as Tag)
  );
}
