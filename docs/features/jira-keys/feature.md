# Jira keys as links

**Story:** as a developer I type `SKYIQ-10143` in a task and it links to the ticket, without pasting a URL. **Laws:** Postel (accept "airasia.atlassian.net" or any page on the site), Hick (one field), Jakob (looks and behaves like the existing link chip).

## Rules

| # | Rule | Test |
|---|---|---|
| J1 | A Jira site is an https origin or blank; a bare host or any page on the site is normalised; http, a login in the URL, `javascript:` and hosts without a dot are refused | `tests/jira.test.ts` |
| J2 | With a site set, a bare key (2-10 capitals/digits, dash, 1-6 digits) links to `<site>/browse/KEY`; without one, text is untouched | `tests/jira.test.ts` |
| J3 | Not keys: `UTF-8`, `SHA-256`, `ISO-8601`, `COVID-19`, lower case, inside words, paths or longer numbers | `tests/jira.test.ts` |
| J4 | A pasted Jira URL and the bare key of the same ticket are one chip; title and plain-text places treat a key link like any link | `tests/jira.test.ts` |
| J5 | `GET /api/jira` returns my site (or `''`); `PUT` writes only a canonical origin or `''`; a hand-edited unsafe cell reads as none; same-origin only for PUT | `tests/settings-api.test.ts` |
| J6 | Column J `jira_base_url` of my Users row; my other cells and other people's rows are untouched; no row means false / null | `tests/sheets.test.ts` |

## Behaviour

- Settings has a **Jira site** field; a bad value shows an inline error and keeps the dialog open.
- Saving applies at once (no reload): rows, stats, the timer and the CSV all use the key link.
- Per profile: saved to the Users row when signed in, cached per account on the device; offline saves go up when back online; the profile's value wins on another device, and clearing it clears it everywhere.
- Task text is never rewritten, so removing the site turns the chips back into plain text.

## Security

Only an https origin is stored and ever used as a link base (no `javascript:`/`data:`); links keep `target=_blank rel="noopener noreferrer"`; the new route is same-origin-checked, rate-limited, size-capped and validated like `/api/settings`; no new host in the CSP (nothing is fetched from the Jira site).

## Checked (375px)

Bad value refused; good value links keys immediately and after a reload; `UTF-8` / `SHA-256` left alone; clearing removes the chips; no console errors.
