import type { Note, Tag } from './notes.ts';

/** Standup rules: built on the phone from tags, no AI and no network. Pure. */

export type Standup = { yesterday: string[]; today: string[]; blockers: string[] };

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

export function formatStandup(s: Standup): string {
  const section = (title: string, items: string[]) =>
    `${title}\n${items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '- None'}`;
  return [section('Yesterday', s.yesterday), section('Today', s.today), section('Blockers', s.blockers)].join('\n\n');
}
