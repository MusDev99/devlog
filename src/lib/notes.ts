/** Pure task rules: no storage, no clock. A note is a task: a status (tag), a place on the matrix, a size and a stopwatch. */

/** Status order. */
export const TAGS = ['todo', 'doing', 'blocker', 'done'] as const;
export type Tag = (typeof TAGS)[number];

export const TAG_LABELS: Record<Tag, string> = { todo: 'To do', doing: 'Doing', blocker: 'Blocked', done: 'Done' };

/** Eisenhower quadrants in reading order of the 2×2 grid: rows important / not, columns urgent / not. */
export const QUADRANTS = ['do', 'schedule', 'delegate', 'eliminate'] as const;
export type Quadrant = (typeof QUADRANTS)[number];

export const QUADRANT_LABELS: Record<Quadrant, { badge: string; name: string; hint: string }> = {
  do: { badge: 'Q1', name: 'Do now', hint: 'Urgent · Important' },
  schedule: { badge: 'Q2', name: 'Schedule', hint: 'Not urgent · Important' },
  delegate: { badge: 'Q3', name: 'Delegate', hint: 'Urgent · Not important' },
  eliminate: { badge: 'Q4', name: 'Drop', hint: 'Not urgent · Not important' },
};

/** Where a task sits: not sorted yet, or a quadrant. New tasks start unsorted. */
export const PLACES = ['unsorted', ...QUADRANTS] as const;
export type Place = (typeof PLACES)[number];

/** T-shirt sizes as points. */
export const SIZES = [1, 3, 5] as const;
export type Size = (typeof SIZES)[number];
export const SIZE_LABELS: Record<Size, string> = { 1: 'S', 3: 'M', 5: 'L' };

export const MAX_NOTE_LENGTH = 500;

export type Note = {
  id: string;
  text: string;
  tag: Tag;
  /** ISO 8601 UTC. */
  createdAt: string;
  /** `YYYY-MM-DD` in the user's zone of the last change (added or moved): drives standup and recap. */
  day: string;
  /** ISO 8601 UTC of the last status change; absent until the task first changes status. */
  movedAt?: string;
  /** Absent on tasks from before the matrix: they read as `schedule`. */
  quadrant?: Place;
  /** Absent reads as 1 (S). */
  size?: Size;
  /** Legacy (Pomodoro, v2.2): still accepted on read, no longer shown. */
  pomodoros?: number;
  /** Stopwatch time banked by finished runs, in ms. */
  spentMs?: number;
  /** ISO 8601 UTC while the stopwatch runs; at most one task has it. */
  startedAt?: string;
};

export const placeOf = (n: Note): Place => n.quadrant ?? 'schedule';
export const sizeOf = (n: Note): Size => n.size ?? 1;

/** S → M → L → S: one tap per step (Fitts), only three choices (Hick). */
export function nextSize(size: Size): Size {
  return SIZES[(SIZES.indexOf(size) + 1) % SIZES.length] ?? 1;
}

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
  if (!TAGS.includes(draft.tag)) return 'Pick a status.';
  return null;
}

/** Total stopwatch time at `nowMs`: banked runs plus the one running. Starts at 0 for a new task. */
export function elapsedMs(note: Note, nowMs: number): number {
  const running = note.startedAt ? Math.max(0, nowMs - Date.parse(note.startedAt)) : 0;
  return (note.spentMs ?? 0) + running;
}

/** The current run only (0 when stopped). */
export function runMs(note: Note, nowMs: number): number {
  return note.startedAt ? Math.max(0, nowMs - Date.parse(note.startedAt)) : 0;
}

/** Stop the stopwatch, banking the run. A stopped task comes back unchanged. */
export function stopTimer(note: Note, at: Date): Note {
  if (!note.startedAt) return note;
  const stopped: Note = { ...note, spentMs: elapsedMs(note, at.getTime()) };
  delete stopped.startedAt;
  return stopped;
}

/** Back to 0:00 (stopped). */
export function resetTimer(note: Note): Note {
  const cleared: Note = { ...note, spentMs: 0 };
  delete cleared.startedAt;
  return cleared;
}

/** A task changed to status `tag` at `at`; `day` is that moment's day in the user's zone. Only Doing keeps a stopwatch running. */
export function moveNote(note: Note, tag: Tag, at: Date, day: string): Note {
  const moved = { ...note, tag, movedAt: at.toISOString(), day };
  return tag === 'doing' ? moved : stopTimer(moved, at);
}

/**
 * Start `id`'s stopwatch: any other running one stops first (one at a time), and the task becomes Doing.
 * Returns only the tasks that changed, ready to save.
 */
export function startTimer(notes: Note[], id: string, at: Date, day: string): Note[] {
  const target = notes.find((n) => n.id === id);
  if (!target || target.startedAt || target.tag === 'done') return [];
  const others = notes.filter((n) => n.id !== id && n.startedAt).map((n) => stopTimer(n, at));
  const doing = target.tag === 'doing' ? target : moveNote(target, 'doing', at, day);
  return [...others, { ...doing, startedAt: at.toISOString() }];
}

/** "1:05:09" / "12:04" on the clock. */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(total % 60)}` : `${pad(m)}:${pad(total % 60)}`;
}

/** "1:05:09" while running, "1h 05m" / "12m" / "0m" at rest. */
export function formatDuration(ms: number, running: boolean): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (running) return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
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
    (v.quadrant === undefined || PLACES.includes(v.quadrant as Place)) &&
    (v.pomodoros === undefined || (Number.isInteger(v.pomodoros) && (v.pomodoros as number) >= 0)) &&
    (v.size === undefined || SIZES.includes(v.size as Size)) &&
    (v.spentMs === undefined || (typeof v.spentMs === 'number' && v.spentMs >= 0)) &&
    (v.startedAt === undefined || typeof v.startedAt === 'string') &&
    TAGS.includes(v.tag as Tag)
  );
}
