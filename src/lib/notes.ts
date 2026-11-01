/** Pure card rules: no storage, no clock. A note is a card on the board; its tag is its column. */

/** Column order on the board. */
export const TAGS = ['todo', 'doing', 'blocker', 'done'] as const;
export type Tag = (typeof TAGS)[number];

export const TAG_LABELS: Record<Tag, string> = { todo: 'To do', doing: 'Doing', blocker: 'Blocked', done: 'Done' };

export const MAX_NOTE_LENGTH = 500;

export type Note = {
  id: string;
  text: string;
  tag: Tag;
  /** ISO 8601 UTC. */
  createdAt: string;
  /** `YYYY-MM-DD` in the user's zone of the last change (added or moved): drives standup and recap. */
  day: string;
  /** ISO 8601 UTC of the last move between columns; absent until the card first moves. */
  movedAt?: string;
};

export type Draft = { text: string; tag: Tag };

/** Postel: accept "blocker: waiting on infra" or "b: ..." and lift the prefix into the tag. */
const PREFIXES: [RegExp, Tag][] = [
  [/^(done|d)\s*:\s*/i, 'done'],
  [/^(todo|t)\s*:\s*/i, 'todo'],
  [/^(doing|wip)\s*:\s*/i, 'doing'],
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
  if (!TAGS.includes(draft.tag)) return 'Pick a column.';
  return null;
}

/** Where the quick "next" button sends a card (Fitts: one tap for the usual move). Done has no next. */
export const NEXT_TAG: Record<Tag, Tag | null> = { todo: 'doing', doing: 'done', blocker: 'doing', done: null };

/** A card moved to `tag` at `at`; `day` is that moment's day in the user's zone. */
export function moveNote(note: Note, tag: Tag, at: Date, day: string): Note {
  return { ...note, tag, movedAt: at.toISOString(), day };
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
    (v.movedAt === undefined || typeof v.movedAt === 'string') &&
    TAGS.includes(v.tag as Tag)
  );
}
