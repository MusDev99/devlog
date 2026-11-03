import { linksIn, plainText } from './links.ts';
import { placeOf, QUADRANT_LABELS, sizeOf, TAG_LABELS, type Note } from './notes.ts';
import { datedRuns, type DayStat } from './stats.ts';
import { taskTiming } from './timing.ts';
import { dayKey } from './today.ts';

/** Activity calendar (heatmap by day), what was worked on a given day, and the CSV report. Pure: time and zone injected. */

export type Cell = DayStat & { level: 0 | 1 | 2 | 3 | 4; future: boolean };
export type Calendar = { weeks: Cell[][]; months: { col: number; label: string }[]; from: string; to: string };

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const shiftDay = (day: string, by: number) => new Date(toUtc(day) + by * DAY_MS).toISOString().slice(0, 10);
const monthName = (day: string) => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(toUtc(day));

/**
 * `count` weeks, Monday first, the last one holding `today` (days after it are `future`).
 * Level 0 = nothing; 1–4 = focus time in quarters of the busiest day; a day with only finished tasks is level 1.
 */
export function calendar(days: Map<string, DayStat>, today: string, count = 12): Calendar {
  const monday = shiftDay(today, -((new Date(toUtc(today)).getUTCDay() + 6) % 7));
  const from = shiftDay(monday, -7 * (count - 1));
  const raw = Array.from({ length: count * 7 }, (_, i) => {
    const day = shiftDay(from, i);
    return days.get(day) ?? { day, focusMs: 0, runs: 0, done: 0, points: 0 };
  });
  const max = Math.max(0, ...raw.filter((d) => d.day <= today).map((d) => d.focusMs));
  const level = (d: DayStat): Cell['level'] => {
    if (d.focusMs > 0 && max > 0) return Math.min(4, Math.max(1, Math.ceil((d.focusMs / max) * 4))) as Cell['level'];
    return d.done > 0 ? 1 : 0;
  };
  const cells = raw.map((d) => ({ ...d, future: d.day > today, level: d.day > today ? 0 : level(d) }));
  const weeks = Array.from({ length: count }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  // A month label over each week holding a 1st of the month, and over the first week unless the next one has a label.
  const months = weeks.flatMap((week, col) => {
    const first = week.find((c) => c.day.endsWith('-01'));
    if (first) return [{ col, label: monthName(first.day) }];
    const nextHasFirst = weeks[1]?.some((c) => c.day.endsWith('-01')) ?? false;
    return col === 0 && !nextHasFirst ? [{ col, label: monthName(week[0]?.day ?? from) }] : [];
  });
  return { weeks, months, from, to: today };
}

export type DayTask = { note: Note; ms: number; finished: boolean };

/** What was worked on `day`: tasks timed that day (time that day) or finished that day. Most time first, then finished. */
export function dayTasks(notes: Note[], day: string, nowMs: number, timeZone: string): DayTask[] {
  const ms = new Map<Note, number>();
  for (const r of datedRuns(notes, nowMs)) if (dayKey(new Date(r.start), timeZone) === day) ms.set(r.note, (ms.get(r.note) ?? 0) + r.ms);
  const finished = notes.filter((n) => n.tag === 'done' && n.day === day);
  return [...new Set([...ms.keys(), ...finished])]
    .map((note) => ({ note, ms: ms.get(note) ?? 0, finished: note.tag === 'done' && note.day === day }))
    .sort((a, b) => b.ms - a.ms || Number(b.finished) - Number(a.finished));
}

/** Tasks touched from `from` to `to`: changed (`day`) or timed in that range. */
export function tasksBetween(notes: Note[], from: string, to: string, nowMs: number, timeZone: string): Note[] {
  const timed = new Set(datedRuns(notes, nowMs).filter((r) => {
    const d = dayKey(new Date(r.start), timeZone);
    return d >= from && d <= to;
  }).map((r) => r.note));
  return notes.filter((n) => timed.has(n) || (n.day >= from && n.day <= to));
}

export const REPORT_HEADERS = [
  'date',
  'task',
  'links',
  'quadrant',
  'story_points',
  'status',
  'created',
  'start',
  'end',
  'pauses',
  'paused_min',
  'actual_min',
  'span_min',
  'actual',
  'span',
] as const;

/**
 * One CSV cell. Quoted when it holds a comma, quote or line break; a leading = + - @ (or tab / CR) gets a `'`
 * so a spreadsheet shows it as text instead of running it as a formula (OWASP CSV injection).
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const placeName = (n: Note) => {
  const p = placeOf(n);
  return p === 'unsorted' ? 'Unsorted' : QUADRANT_LABELS[p].name;
};
const minutes = (ms: number) => String(Math.round(ms / 60_000));
const readable = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
};

/** The report as CSV text (CRLF, header row first), newest change first; times are local "YYYY-MM-DD HH:mm" in `timeZone`. */
export function reportCsv(notes: Note[], nowMs: number, timeZone: string): string {
  const local = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
  const when = (iso: string | null | undefined) => {
    if (!iso || !Number.isFinite(Date.parse(iso))) return '';
    const p = Object.fromEntries(local.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  };
  const rows = [...notes]
    .sort((a, b) => b.day.localeCompare(a.day) || (b.movedAt ?? b.createdAt).localeCompare(a.movedAt ?? a.createdAt))
    .map((n) => {
      const t = taskTiming(n, nowMs);
      return [
        n.day,
        plainText(n.text),
        linksIn(n.text).map((l) => l.href).join(' '),
        placeName(n),
        String(sizeOf(n)),
        TAG_LABELS[n.tag],
        when(n.createdAt),
        when(t?.start),
        when(t?.end),
        t ? String(t.pauses) : '',
        t ? minutes(t.pausedMs) : '',
        t ? minutes(t.actualMs) : '',
        t ? minutes(t.spanMs) : '',
        t ? readable(t.actualMs) : '',
        t ? readable(t.spanMs) : '',
      ];
    });
  return [[...REPORT_HEADERS], ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
