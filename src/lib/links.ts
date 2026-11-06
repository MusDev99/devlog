/** Links inside task text. Pure and import-free: the text stays as typed; this only reads it. */

export type Part = { kind: 'text'; value: string } | { kind: 'link'; href: string; label: string };

const URL_RE = /https?:\/\/[^\s<>"'`]+/g;
/** Sentence punctuation right after a link belongs to the sentence, not the URL. */
const TRAILING = /[.,;:!?)\]}]+$/;

/** A short, recognisable name for a link: the Jira key, owner/repo#n on GitHub, else host + path. */
export function linkLabel(url: URL): string {
  const jira = url.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/) ?? url.searchParams.get('selectedIssue')?.match(/^([A-Z][A-Z0-9_]*-\d+)$/);
  if (jira?.[1]) return jira[1];
  const gh = url.hostname === 'github.com' && url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:pull|issues)\/(\d+)/);
  if (gh) return `${gh[1]}/${gh[2]}#${gh[3]}`;
  const path = url.pathname.replace(/\/$/, '');
  const short = `${url.hostname.replace(/^www\./, '')}${path}`;
  return short.length > 32 ? `${short.slice(0, 31)}…` : short;
}

/** Split text into plain parts and http(s) links. Anything that is not a valid http(s) URL stays text. */
export function splitLinks(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0].replace(TRAILING, '');
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    const at = m.index ?? 0;
    if (at > last) parts.push({ kind: 'text', value: text.slice(last, at) });
    parts.push({ kind: 'link', href: url.href, label: linkLabel(url) });
    last = at + raw.length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

/** The task's words without its links (for the title line); falls back to the link labels if that is all there is. */
export function titleText(text: string): string {
  const parts = splitLinks(text);
  const words = parts
    .filter((p) => p.kind === 'text')
    .map((p) => (p as { value: string }).value)
    .join('')
    .replace(/\(\s*\)|\[\s*\]/g, '') // brackets that only held a link
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return words || parts.filter((p) => p.kind === 'link').map((p) => (p as { label: string }).label).join(' ');
}

/** The links in a task, in order, without duplicates. */
export function linksIn(text: string): { href: string; label: string }[] {
  const seen = new Set<string>();
  return splitLinks(text).flatMap((p) => (p.kind === 'link' && !seen.has(p.href) && seen.add(p.href) ? [{ href: p.href, label: p.label }] : []));
}

/** Text for places that cannot hold links (timer chip, title bar): each link replaced by its label. */
export function plainText(text: string): string {
  return splitLinks(text)
    .map((p) => (p.kind === 'text' ? p.value : p.label))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Where a task's work lives: its first link, grouped the way a developer thinks (a Jira ticket, a GitHub repo, else a site). */
export type Source = { kind: 'jira' | 'github' | 'other'; key: string; label: string; href: string };

export function sourceOf(text: string): Source | null {
  const first = splitLinks(text).find((p) => p.kind === 'link');
  if (!first || first.kind !== 'link') return null;
  const url = new URL(first.href);
  const jira = url.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/) ?? url.searchParams.get('selectedIssue')?.match(/^([A-Z][A-Z0-9_]*-\d+)$/);
  if (jira?.[1]) return { kind: 'jira', key: `jira:${jira[1]}`, label: jira[1], href: first.href };
  const gh = url.hostname === 'github.com' && url.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (gh) return { kind: 'github', key: `github:${gh[1]}/${gh[2]}`.toLowerCase(), label: `${gh[1]}/${gh[2]}`, href: `https://github.com/${gh[1]}/${gh[2]}` };
  const host = url.hostname.replace(/^www\./, '');
  return { kind: 'other', key: `other:${host}`, label: host, href: `${url.protocol}//${url.host}` };
}
