# Feature: Done bucket and links in tasks

Owner requests (2026-11-03): "after activity done, it will clear from quadrant tab, instead it will move into done bucket, it can be restore" and "I can put a link url, for example: Fix bugs on 10143 https://airasia.atlassian.net/browse/SKYIQ-10143".

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| D1 | Finishing a task (tick or drop on Done) removes it from its quadrant and lists it in Done | `places` / `doneBucket` tests; manual run: Q1 → 0, Done → 1 |
| D2 | Done shows newest first, quadrant, points, actual (and span), day; older than a week under Earlier | `doneBucket` test; manual run |
| D3 | Restore puts it back in the same quadrant as To do, with "Restored to …" and Undo | Manual run: back in Do now |
| K1 | "Fix bugs on 10143 https://…/browse/SKYIQ-10143" reads "Fix bugs on 10143" with a SKYIQ-10143 chip opening the URL in a new tab | `tests/links.test.ts`; manual run |
| K2 | Only http(s) links; trailing punctuation not part of the link; duplicates once; GitHub `owner/repo#n`; other sites shortened | `tests/links.test.ts` |
| K3 | Links open with `noopener noreferrer`, never start a drag or select the row; chip tap target 44px | Manual run (`target=_blank`, rel, 44px) |

## Laws of UX

| Law | Where |
|---|---|
| Zeigarnik | The matrix shows only what is still open |
| Peak-End | Finishing has a place to go (Done) and a way back (Restore, Undo) |
| Jakob | Jira keys read like they do everywhere else at work |
| Fitts | 28px link chips inside 44px targets |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A03 Injection | Links are parsed with `new URL`, http(s) only, rendered as `href` attributes by Preact (no HTML injection); `javascript:` stays text |
| A01 / tabnabbing | `target=_blank` with `rel="noopener noreferrer"` |
