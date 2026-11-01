import type { Note, Tag } from './notes.ts';

/** Standup rules: built on the phone from the board, no AI and no network. Pure. */

export type Standup = { yesterday: string[]; today: string[]; blockers: string[] };

const unique = (items: string[]) => [...new Set(items)];

/**
 * Deterministic standup from the board, always available offline.
 * Yesterday: cards done or doing on the last day before today with any change (weekends skipped).
 * Today: cards finished today, then everything still in Doing. Blockers: everything in Blocked.
 */
export function ruleStandup(cards: Note[], today: string): Standup {
  const byTime = [...cards].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const texts = (keep: (n: Note) => boolean) => byTime.filter(keep).map((n) => n.text);
  const working = (tag: Tag) => tag === 'done' || tag === 'doing';
  const previous = byTime.reduce((latest, n) => (n.day < today && n.day > latest ? n.day : latest), '');
  return {
    yesterday: unique(texts((n) => n.day === previous && working(n.tag))),
    today: unique([...texts((n) => n.day === today && n.tag === 'done'), ...texts((n) => n.tag === 'doing')]),
    blockers: unique(texts((n) => n.tag === 'blocker')),
  };
}

export function formatStandup(s: Standup): string {
  const section = (title: string, items: string[]) =>
    `${title}\n${items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '- None'}`;
  return [section('Yesterday', s.yesterday), section('Today', s.today), section('Blockers', s.blockers)].join('\n\n');
}
