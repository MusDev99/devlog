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

## Acceptance criteria: 2. Google sign-in + Users sheet

| ID | Given / When / Then | Evidence |
|---|---|---|
| S1 | No session online → sign-in screen; "Continue with Google" → Google → back signed in, URL cleaned | Manual run with a local mock of the Google round trip (real cookie code) |
| S2 | First sign-in appends a Users row (email, name, google_id, registered_at, last_login_at); a returning email updates name and last login, no duplicate | `tests/sheets.test.ts` (fake Google) |
| S3 | Writes are RAW; the service-account JWT is RS256 for the Sheets scope at the fixed token host; the token is cached | `tests/sheets.test.ts` |
| S4 | Any verified Google account registers unless `ALLOWED_EMAILS` is set; cookies tamper-proof; OAuth and session cookies not interchangeable; ID token checks | `tests/auth.test.ts` |
| S5 | A device that signed in before opens offline; a server-side sign-out shows "Your session ended"; Sign out returns to the sign-in screen | Manual run |
| S6 | Each account has its own local database; pre-sign-in tasks go to the first account once | Manual run (`devlog:tester@example.com` created) |
| S7 | Without a sign-in server (local dev / not set up) the app runs local-only | Manual run on `vite dev` |

## Acceptance criteria: 3. Tasks sheet sync

| ID | Given / When / Then | Evidence |
|---|---|---|
| R1 | The owner's example becomes a Tasks row: start 11:00, end 13:00, 3 pauses, 30 paused, 90 actual ("1h 30m"), 120 span ("2h 00m") | `tests/tasks-api.test.ts`; manual end-to-end through the real handler into an in-memory sheet |
| R2 | A change updates the same row (no duplicate); a new task appends; a delete marks `deleted`; another person's row is never touched | `tests/tasks-api.test.ts` (upsertTasks); manual run |
| R3 | `/api/tasks` refuses: not POST 405, not set up 503, cross-site 403, signed out 401, busy 429, sheet missing 503, > 64 KB or > 50 items 413, bad JSON / shape / task 400; sheet failure 502; email always from the session | `tests/tasks-api.test.ts` |
| R4 | Offline / sheet unreachable: changes wait on the device ("1 not synced · Retry"); back online + Retry → synced | Manual run |
| R5 | Pending = never synced or saved since; deletes only for tasks the sheet has; Undo cancels a delete; batches by count and size; backoff 15s → 5m | `tests/sync.test.ts` |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A01 Access | Rows owned by the session email; another person's rows are refused; email never from the body |
| A02 Secrets | Service-account key and OAuth secret only in Vercel env; `.env.example` holds placeholders |
| A03 Injection | Sheets writes are RAW: a title like `=IMPORTXML(…)` stays text |
| A04 Design | The device stays the source; the sheet is a record; a sheet error never blocks sign-in or work |
| A05 CSRF | Cookie-authenticated POST requires same-origin (`Sec-Fetch-Site` / `Origin`) |
| A07 Auth | OIDC + PKCE, ID token verified (iss, aud, exp, nonce, email_verified), signed cookies |
| A10 SSRF | Google hosts are fixed constants; `SHEET_ID` must look like an id, not a URL |

## Acceptance criteria: 4. Profile photo

| ID | Given / When / Then | Evidence |
|---|---|---|
| P1 | The ID token's `picture` is kept only if it is `https` on `*.googleusercontent.com`; same rule in browser and server | `tests/profile.test.ts`, `tests/auth.test.ts` |
| P2 | Users rows get `picture_url`; an existing 5-column tab gains the header, its rows untouched | `tests/sheets.test.ts` |
| P3 | The header and Settings show the photo; a failed load shows the initial | Manual run (photo loads; broken URL shows "T") |

## Acceptance criteria: 5. Settings per profile

| ID | Given / When / Then | Evidence |
|---|---|---|
| G1 | Daily targets are stored in the person's Users row (G:I); blank until saved; never written to someone else's row | `tests/sheets.test.ts` |
| G2 | `GET /api/settings` returns my targets or null; `PUT` validates (limits) and writes; guards 405 / 503 / 403 (PUT) / 401 / 429 / 413 / 400 / 404 / 502 | `tests/settings-api.test.ts` |
| G3 | First sign-in with nothing saved: the device's targets go to the profile | Manual run (mock with the real handler): Users row 4 / 13 / 90 |
| G4 | Saving in Settings updates the row and says "Saved to your profile" | Manual run: row 4 / 21 / 90 |
| G5 | Another device (nothing cached) gets the profile's targets at sign-in | Manual run: rings "of 21 SP", "of 4", "of 1h 30m" |

## Laws of UX

| Law | Where |
|---|---|
| Jakob | Start / Pause / Resume is the stopwatch wording people already know |
| Von Restorff | Actual is the one big number; span and pauses are secondary |
