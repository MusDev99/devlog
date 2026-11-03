# Feature: Google sign-in and Google Sheets record

Owner request (2026-11-03): sign in with Google (first-time emails registered into a Users table in a Google Sheet); every task recorded in the sheet with start time, end time and two totals: **actual** (end − start − paused) and **span** (end − start). Example: 11:00 → 13:00 with three 10-minute pauses = 1h 30m actual, 2h span.

Owner decisions: one central sheet the owner owns (written server-side); the phone stays offline-first and syncs a record per task; sign-in is required.

Delivered in three PRs:
1. **Timing** (this file's first slice): Pause / Resume / Finish, actual vs span from the stopwatch runs.
2. **Google sign-in + Users sheet**.
3. **Tasks sheet sync** with an offline queue.

## Acceptance criteria: 1. Timing

| ID | Given / When / Then | Evidence |
|---|---|---|
| T1 | Runs 11:00–11:20, 11:30–12:00, 12:10–12:40, 12:50–13:00 → start 11:00, end 13:00, 3 pauses, 30m paused, actual 1h 30m, span 2h | `tests/timing.test.ts` |
| T2 | Running: actual and span count up to now; paused and unfinished: the span ends at the last pause | `tests/timing.test.ts` |
| T3 | Time logged before runs were dated: actual known, start / end blank | `tests/timing.test.ts` |
| T4 | The big clock shows Actual with "Span · pauses" and the start time; the button reads Start / Pause / Resume; ✓ is Finish | Manual run: "45:00 · Paused · Span 1h 00m · 1 pause (15m) · Started 9:00", Resume |
| T5 | Finished rows show "1h 30m · span 2h 00m"; Stats "Finished today" shows actual (and span on wider screens) | Manual run |

## Laws of UX

| Law | Where |
|---|---|
| Jakob | Start / Pause / Resume is the stopwatch wording people already know |
| Von Restorff | Actual is the one big number; span and pauses are secondary |
