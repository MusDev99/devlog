/**
 * The person's Jira site, so a bare issue key like SKYIQ-10143 in a task becomes a link.
 * Import-free: `api/` shares these rules (validated on both sides). Only an https origin is ever stored.
 */

export const MAX_JIRA_LENGTH = 200;

/**
 * "airasia.atlassian.net" or "https://airasia.atlassian.net/jira/..." -> "https://airasia.atlassian.net".
 * '' for blank (clears it); null when it cannot be a Jira site (not https, has a login in it, no dotted host).
 */
export function normalizeJiraBase(input: string): string | null {
  const text = input.trim();
  if (text === '') return '';
  if (text.length > MAX_JIRA_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || !url.hostname.includes('.')) return null;
  return url.origin;
}

/** What is stored and sent: '' (none) or an https origin exactly as `normalizeJiraBase` writes it. */
export const isJiraBase = (value: unknown): value is string => typeof value === 'string' && (value === '' || normalizeJiraBase(value) === value);

/** The Users-sheet cell (`jira_base_url`) read back: '' when blank or edited by hand to something unusable. */
export const jiraFromCells = (cells: string[]): string => {
  const value = (cells[0] ?? '').trim();
  return isJiraBase(value) ? value : '';
};
export const jiraToCells = (value: string): string[] => [value];
