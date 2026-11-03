# Changelog

## 2026-11-03 13:00

- feat(auth): Google sign-in is back and now required: OIDC + PKCE, signed cookies (restored from v1.0); any verified Google account self-registers (`ALLOWED_EMAILS` optional)
- feat(sheets): first sign-in registers the person in the **Users** tab of the owner's Google Sheet (email, name, Google id, registered, last login) through a service account; RAW writes only
- feat(auth): sign-in screen; a device that signed in before opens straight away offline; "session ended" and "offline" states; account and Sign out in Settings; avatar in the header
- feat(storage): one IndexedDB per account (`devlog:<email>`); tasks made before sign-in are copied into the first account once
- chore: `.env.example` back; smoke check "session refuses anonymous" replaces "no server functions"

## 2026-11-03 10:00

- feat(timer): Start / Pause / Resume / Finish; each task now shows **actual** time (span − pauses) and **span** (first start to finish): the big clock adds "Span 2h · 3 pauses (30m)" and when it started; finished rows and Stats show "1h 30m · span 2h"
- feat(timer): `src/lib/timing.ts` computes start, end, pauses, actual and span from the stopwatch runs (tested with 11:00 → 13:00, three 10-minute pauses → 1h 30m / 2h)

## 2026-11-03 03:30

- feat(pwa): mobile-first shell: bottom tab bar (Timer / Tasks / Stats) with open-task badge and running dot, safe-area aware; mini player and toasts sit above it
- feat(pwa): Install button where the browser offers it; one-time Share → Add to Home Screen hint on iPhone / iPad
- feat(pwa): updates wait for "New version ready · Reload" instead of swapping mid-task; checks for updates when the app returns to the foreground
- feat(pwa): manifest `id`, current colours, categories, app shortcuts (Timer, Add a task, Stats); iOS standalone meta tags
- feat(pwa): open-task badge on the app icon, persistent storage request, haptic tick on Start / Stop, no overscroll bounce when installed
- fix(pwa): the installed app opened blank offline: cached JS / CSS were missed because of `Vary: Origin`; lookups now ignore Vary (SW `v2`)

## 2026-11-03 02:00

- feat(stats): Stats screen: today's story points, tasks done and focus time as rings against daily targets; activity and on-target streaks; finished-today list
- feat(stats): last 7 days chart switchable between Time, Points and Tasks with the target line; weekly review against the week before (sessions, best day, top task, longest streak)
- feat(stats): where the time went by quadrant and by task, with minutes per story point; up to five plain-language insights (firefighting, low-value time, sizing, trend, peak hour, blockers)
- feat(settings): daily targets for tasks, story points and focus time (⚙), kept on the device
- feat(ui): screen switch: Timer / Tasks / Stats on phones, Focus / Stats on wide screens; open-task badge and running dot
- feat(timer): every stopwatch run is saved with its start and end so time can be placed on days

## 2026-11-03 00:30

- feat(timer): stopwatch per task replaces the Pomodoro: Start counts up from 0, Stop keeps the total, one running at a time, survives reloads; Reset (undoable) and Done beside the big Start/Stop
- feat(tasks): every row has its own Start/Stop and shows time logged (live while running); ▶ in the add row adds and starts
- feat(ui): colour grading: re-graded neutrals and matched accent hues; the app turns teal while a clock runs, coral when idle, with a soft wash behind the timer
- feat(ui): lean layout: no outer task card, progress bar under "Tasks", icon List / Matrix switch, Unsorted only when needed, quadrant drop zones light up in their own colour, row extras on hover (always on touch)
- feat(ui): Standup and Week merged into one live Reports card with Copy; phone mini player; Space / N shortcuts; tap squeeze, tick pop, rise-in motion (off with reduced motion)
- removed: Pomodoro modes, breaks and 🍅 counts (old fields are read and ignored)

## 2026-11-02 22:30

- feat(ui): redesign as a Pomodoro panel beside Session Tasks (ring timer, Focus / Short Break / Long Break, Pause / Resume / Reset)
- feat(pomodoro): Focus 25 / Short 5 / Long 15 min, long break every 4 rounds; a finished focus round adds a 🍅 and its minutes to the focus task; survives reloads
- feat(tasks): new tasks land in Unsorted; List / Matrix switch; tinted Q1–Q4 quadrants (Do now, Schedule, Delegate, Drop); done tasks stay crossed out in place for a week; done/total badge
- feat(tasks): add row with story points (1 / 3 / 5 SP) and 🍅 "add and focus"; drag rows with the mouse or long-press on touch, menu as the no-drag path
- removed: per-task start/stop stopwatch, overview tiles and the separate Done list (old timer fields are read and ignored)

## 2026-11-02 15:30

- feat(matrix): Eisenhower dashboard replaces the kanban board: Do first / Schedule / Delegate / Eliminate on urgent × important axes
- feat(matrix): drag tasks by a handle with mouse or touch onto a quadrant or Done; phone uses a 2×2 selector, wide screens the full grid
- feat(matrix): T-shirt size per task (S 1 / M 3 / L 5) with points per quadrant
- feat(matrix): start/stop timer per task, one at a time, survives reloads; running bar with Stop; tracked time per quadrant
- feat: status (To do / Doing / Blocked / Done) stays per task, so the standup and Friday recap keep working; old cards land in Schedule as size S

## 2026-11-02 00:30

- feat(board): kanban board replaces the day list: To do / Doing / Blocked / Done, one persistent board
- feat(board): phone shows one column behind count tabs; wide screens show four columns with drag and drop
- feat(board): one-tap "next column" button and a menu (any column, Delete) on every card; Undo for moves and deletes
- feat(board): Done cards older than 7 days fold into Earlier; new cards go to the selected column, `todo:` prefix added
- feat: standup and Friday recap are built from the board (Today = done today + still in Doing, Blockers = Blocked column)
- fix: text typed while a card is saving is no longer wiped

## 2026-11-01 23:00

- feat!: remove the AI standup, Google sign-in and every `api/` function; the standup is built on the phone from tags
- chore: drop `@anthropic-ai/sdk`, `zod`, `esbuild`, `npm run eval` and `.env.example`; no environment variables or API keys needed
- test: smoke checks a static deploy (headers, PWA files, no server functions)

## 2026-11-01 22:00

- feat(ui): Material Design 3 redesign in Tailwind (colour-role tokens, state layers, filter chips, filled text fields, snackbar, bottom-sheet composer)
- feat(ui): inline Material icons (`src/components/Icon.tsx`), no new host in the CSP

## 2026-11-01 21:37 · v1.0.0

- feat: `npm run smoke -- <url>` post-deploy check (security headers, PWA files, session/standup refuse anonymous and cross-site calls, sign-in uses PKCE); passes with AI on or off
- docs: Laws of UX and accessibility review of every screen at 375px, release checklist (`docs/features/release-v1/`)
- chore: version 1.0.0: offline notes, AI standup with Google sign-in, Friday recap

## 2026-10-31 22:19 · v0.5.0

- feat(recap): Friday recap card (shipped / in progress / blockers, days logged) built on the phone from this week's notes, works offline
- feat(recap): opens by itself Friday to Sunday; "Week so far" row on other days; one-tap copy
- test: week range, recap rules and copy text

## 2026-10-31 22:16 · v0.4.0

- feat(auth): Google sign-in (OIDC + PKCE) with an email allow-list replaces the shared passcode for the AI standup
- feat: account line on the standup card ("AI on · email" / Sign in with Google / Sign out) and a sign-in result toast
- security: signed `HttpOnly` cookies, same-origin check on cookie-authenticated requests, per-account rate limit, fail closed without config
- test: auth tests (ID token checks, cookie tampering, PKCE vector, limiter); `npm run eval` now calls Claude directly
- docs: Google OAuth setup, new environment variables, OWASP audit

## 2026-10-31 15:15

- ci: `branch-cleanup.yml` deletes a PR's branch after it is merged (skips forks, `main`, stacked bases)

## 2026-10-31 04:26

- feat(agents): `/team resume <slug>` picks a run back up from the feature's status line
- feat(agents): every run appends to `docs/features/<slug>/runs.md` (role, task, round, outcome)
- feat(agents): QA reviews with the shared code-review skill; any 🔴 or 🟠 finding means `CHANGES`

## 2026-10-30 12:30

- chore(agents): shared code-review skill in `.agents/skills/code-review/SKILL.md` (7-area checklist, findings by severity)

## 2026-10-30 03:58

- feat(agents): five-role agent team for Claude Code (Product Owner, Project Manager, Software Engineer, QA, DevOps) and a `/team` command with two owner gates and a 3-round QA cap
- chore(agents): deny rules for `.env`, pushes to `main`, force-push and merge; `tests/agents.test.ts` checks roles and rules

## 2026-10-28 23:52 · v0.3.0

- feat: standup card (yesterday / today / blockers) with one-tap copy
- feat: AI standup through `POST /api/standup` (passcode, rate limit, 4,000-character cap, structured output, every item must cite a note, missing blockers added back)
- feat: rule-based standup when offline, without a passcode, or when the AI fails, with the reason shown
- test: golden set of 10 note days (`tests/golden/`), `npm run eval` for the live check

## 2026-10-28 23:44 · v0.2.0

- feat: quick notes tagged done / doing / blocker, saved in IndexedDB on the device (works offline)
- feat: tag prefixes (`b:`, `done:`, `wip:`) are lifted into the tag; voice dictation where the browser supports it
- feat: today view grouped by tag, delete with 5-second undo, loading and storage-error states

## 2026-10-28 22:54 · v0.1.0

- feat: project scaffold (Vite 7 + Preact 10 + Tailwind 4, strict TypeScript)
- feat: installable PWA that launches offline (manifest, icons, service worker with tested routing rules)
- ci: `verify` (typecheck + tests + build + audit) and `branch-policy` workflows, PR template
- docs: CLAUDE.md, README, feature spec for the scaffold
