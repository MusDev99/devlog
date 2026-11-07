# Changelog

## 2026-11-07 14:00

- feat(tasks): **one way to add per screen size.** On a phone (under 768 px) the quick add row is hidden and **New activity** (the step-by-step flow) is the only add; from 768 px up the quick add stays and the flow button is hidden. The `?new=1` shortcut opens the flow on a phone and focuses the add field on a wide screen

## 2026-11-07 12:00

- feat(tasks): **guided "New activity" flow on phones, one question per screen.** A **New activity** button under the quick add opens a full-screen, booking-style flow: what you are working on (required), a Jira or GitHub link (with a live check that it was recognised, e.g. "Jira ticket: SKYIQ-10143"), a story-point size, and a quadrant (four cards with the app's own colour dots). A segmented progress bar, Back (keeps every choice), Skip on every step but the first, a sticky Next / **Add activity** bar, a slide between steps (cut by reduced motion), close or Esc to discard. The quick add stays for fast capture; the button is phones only (hidden from 768 px)
- A skipped size counts as 1 and a skipped quadrant stays Unsorted, as in the quick add. `wip:` / `b:` / `done:` prefixes in the title still set a status. A bad link, or a title plus link over 500 characters, is explained on the screen and sends you to the step that can fix it
- Adding uses the same optimistic save as the quick add: the task shows at once, and if the device write fails the dialog stays open with every answer still there. A toast says where it landed ("Added to Schedule")
- Rules in `src/lib/flow.ts` (pure, 8 tests): steps, link check, building the text, per-step blockers, the final result. Screens in `src/components/NewActivity.tsx` (a native `<dialog>`: focus trapped, Esc closes). Checked in a phone-sized browser; text contrast measured at 6.5:1 or better in both modes

## 2026-11-06 23:00

- feat(links): **type a Jira key and it links.** Set your **Jira site** in Settings (`yourteam.atlassian.net`, or paste any page on it); a bare key like `SKYIQ-10143` in a task then becomes the same chip as a pasted Jira URL (`<site>/browse/SKYIQ-10143`), the title drops it, and Stats groups time by that ticket. Nothing changes until a site is set
- Only an https origin is ever stored: `normalizeJiraBase` turns "airasia.atlassian.net" or any page on the site into `https://airasia.atlassian.net`, and refuses http, logins in the URL, `javascript:` and hosts without a dot (rules in `src/lib/jira.ts`, import-free, validated on the device and on the server)
- Keys are matched narrowly so ordinary text is left alone: 2-10 capitals/digits, a dash, 1-6 digits, not inside words, paths or other keys, and not look-alikes such as `UTF-8`, `SHA-256`, `ISO-8601`, `COVID-19`
- The Jira site is **per profile**, like daily targets: new `jira_base_url` column (J) in the Users sheet (an older tab gains the header, rows untouched), `GET` / `PUT /api/jira` (same generic handler as `/api/settings`, now with a `field` name; PUT same-origin only), cached per account on the device; an unconfirmed change goes up first, otherwise the profile's value wins (an empty one clears it)
- Not stored in tasks: task text is still kept as typed, so clearing the site turns the links back into plain text

## 2026-11-06 21:00

- feat(stats): **Time by ticket or repo** (last 7 days): tracked time grouped by the first link in each task, a Jira ticket (`SKYIQ-10143`) or a GitHub repo (PRs and issues of one repo add up), largest first, with tasks, done count, points and the share of time that has a link; the label opens the ticket. `sourceOf` in `src/lib/links.ts`, `streams` in `src/lib/work.ts`
- feat(stats): **Sizing check** (last 4 weeks): average time of finished, timed tasks per story-point size, and a plain verdict: bigger sizes take longer (points track effort), or "an 8 SP task took less time than a 5 SP one: re-size after finishing". `sizing` in `src/lib/work.ts`
- feat(insights): **work-in-progress warning** when three or more tasks are in Doing ("finish one before starting another"), shown first
- fix(stats): the "By task" list could push the Stats page wider than a 375 px screen when a task title was long (a grid column sized to its text); it now uses `minmax(0, 1fr)` like the other lists
- Already covered by Stats, so not repeated: planned (Schedule) versus reactive (Do now) share of time, and pace per story point per task ("Where your time went"). Spec: `docs/features/dev-metrics/feature.md`

## 2026-11-06 19:00

- feat(tasks): **one bottom sheet for a task's actions** (`RowSheet.tsx`, a native modal dialog: focus trapped, Esc closes, tap outside closes) replaces the menu that expanded inside each row and pushed the list down. Move to, Story points (stays open so you see the change), Status, Delete. Opens from the ⋯ button or a left swipe
- feat(tasks): **less on every row**: only the first link shows, the rest sit behind a `+n` chip (tap to show all); the place label no longer repeats "Unsorted" on every List row; rows keep tick, title, points, Start and ⋯
- feat(tasks): **quadrants collapse** (tap the header; remembered per device); an empty quadrant on a phone is a slim drop strip instead of a 160 px box
- feat(composer): **the add field is quiet until you use it**: size and ▶ appear on focus or once there is text (always visible from 640 px wide)
- feat(tasks): **today's points toward your target** next to the Tasks title (`8/10 SP today`, turns green with a check at the target); the number pops when it changes
- Spec: `docs/features/declutter/feature.md`

## 2026-11-06 17:00

- feat(gestures): **swipe a task row on a phone.** Swipe right to finish it (or reopen a done one), swipe left for its actions. The row follows the finger by transform only, with a green Done / accent More layer behind it, a faint buzz when you pass the point where letting go acts, a rubber-band past it, a flick commits early, and a short swipe springs back. Vertical movement is never touched, so scrolling stays the browser's (`touch-action: pan-y pinch-zoom`); pinch zoom still works. Mouse users still drag, and every action keeps its button (the tick, the ⋯ menu), so the swipe is a shortcut and never the only way
- Rules (`src/lib/swipe.ts`, pure, 9 tests): axis lock after 8 px (a diagonal stays a scroll), threshold 30% of the row (72-160 px), 1:1 then 35%, a direction with no action resists to 24 px. `src/lib/use-swipe.ts` applies them; a long-press drag and a swipe never start together (`dragState`)
- perf(drag): rows ignore the pointer while a task is dragged (no hover restyle on every move); drag cost 14-19 -> 11-16 ms per move at 4x throttle
- change(row): rows are opaque (`bg-surface-high`) so the layer behind never shows through

## 2026-11-06 14:30

- perf(instant): **taps answer in the same frame.** Add, Start / Pause, status, move, size, delete and Undo change the screen first and write to the device in the background (`save` / `add` / `remove` / `restore` in `App.tsx`). If a write fails, only the tasks still showing that attempt go back as they were (later edits stay), its Undo goes away and a toast says so; a failed add puts the text back in the field. Pure rules in `src/lib/optimistic.ts` (tested)
- change(composer): the field clears as soon as you add (the task is on the list at once); it no longer disables the buttons while saving
- feat(loading): **skeleton screens** that match the real layout (task rows in quadrants, Stats cards, the Standup card, the timer's task pill and status line) with a transform-only shimmer. They stay invisible for the first 150 ms (`useDelayed`), so a fast load shows nothing and a slow one fades in; no empty "Pick a task" / empty standup flash while tasks load. Reduced motion stops the shimmer
- measured with every device write delayed 200 ms (a slow phone): add 205 -> 4 ms, Start 224 -> 10 ms, Done 212 -> 19 ms before the first visual change. Spec: `docs/features/instant-feedback/feature.md`

## 2026-11-06 12:00

- perf(render): **a tick no longer re-renders the app.** The one-second clock moved out of `App` into a shared ticker (`src/lib/clock.ts`, pure and tested; `useClock` in `src/lib/use-clock.ts`). Only the running row, the stopwatch, the mini player, the tab title and (on Stats) the stats subscribe, so with 100 tasks a tick touches one row instead of the whole tree
- perf(render): task rows are memoised and get one stable bundle of handlers; the Tasks and Reports parts are mounted only for the open screen on a phone (wide screens keep both); standup, recap and stats are memoised
- perf(drag): the drag ghost moves by `transform` (no re-render per pointer move), the drop target is read once a frame, and the non-passive `touchmove` guard is armed only for a touch that starts on a row, so ordinary scrolling is no longer held up by it
- perf(paint): rows skip rendering while off screen (`content-visibility`), only a just-added row animates in, and the tab bar, mini player and timer card use a solid surface on touch devices instead of `backdrop-blur`
- measured at 375px, 100 tasks, 4x CPU throttle (`scripts/perf.cjs`): idle tick 390 -> ~135 ms per 5 s, drag 48 -> 14 ms per move, tap to paint 35-81 -> 20-45 ms. Plan: `docs/features/perf-render/feature.md`

## 2026-11-04 18:34

- feat(sound): **a cheer when you finish a task** and **a seatbelt chime when you start, resume or pause one**. Finish covers the Finish button, a row's check, dropping on Done; the chime covers the timer, a row's Start / Stop, the Space key, the composer's ▶ and any status change that stops a running clock
- feat(settings): **Sounds** switch (per device, applies at once, plays the chime when turned on); the Vibration switch sits beside it
- Sounds are decoded once with Web Audio and played from memory, so they answer the tap at once; the files are hashed into `/assets` and **precached**, so they play offline. `src/lib/sound.ts` (player, injected audio, tested) and `src/lib/sounds.ts` (the two files); the service worker precache list now includes `.mp3`
- The seatbelt file was converted from a 197 KB stereo WAV to a 14 KB mono MP3 (same 1.1 s)

## 2026-11-04 15:10

- feat(haptics): **vibration on Start, Stop and Finish** (Vibration API). Each feels different: Start = one firm 30 ms buzz, Stop / Pause = two light taps, Finish = a rising triple. Works from the big timer, a row's Start / Stop, the Space key, the composer's ▶ (add and start), Finish, dropping a task on Done, and any status change that stops a running clock. The faint lift tick when dragging a task uses the same module
- feat(settings): **Vibration** switch in Settings, per device and applied at once (turning it on gives a sample buzz); hidden on browsers that cannot vibrate (iPhone / iPad Safari)
- change: the old single 12 ms tick (barely felt on most phones, Start / Pause only) is replaced; `src/lib/haptics.ts` with unit tests

## 2026-11-04 00:30

- feat(stats): **Last 12 weeks** calendar heatmap of focus time; tap a day (or use the arrows) to see the tasks worked on and finished that day, with time, quadrant and points
- feat(stats): **CSV report** download for the 12 weeks or one day: date, task, links, quadrant, SP, status, created, start, end, pauses, paused / actual / span minutes and readable times; built on the device, safe against spreadsheet formula injection
- change(layout): the app uses the full window width on large screens (no centred max width) and the quadrants are taller

## 2026-11-03 23:00

- feat(tasks): finishing a task clears it from its quadrant and moves it to a **Done** bucket under the matrix (newest first, older than a week under Earlier) with quadrant, points, actual / span time and day; **Restore** sends it back to its quadrant ("Restored to Do now", undoable); drop a task on Done to finish it
- feat(tasks): links in task text become chips: Jira URLs show their issue key (e.g. SKYIQ-10143), GitHub PRs / issues `owner/repo#n`, others a short host/path; they open in a new tab; titles show the words only, and the timer, stats and tab title show labels instead of raw URLs
- change: the List view shows open work only (finished work is in Done)

## 2026-11-03 21:30

- feat(signin): redesigned sign-in page: headline with gradient, four feature tiles, the official multi-colour Google button with hover lift, drifting colour backdrop and dot grid
- feat(signin): looping animated product story (tasks land in Unsorted and glide into their quadrants, the stopwatch fills to "1h 30m actual · span 2h", "+3 SP" pops, the week's bars grow, "Synced to Google Sheets"), pure CSS on transform / opacity, no GIF or new host; reduced motion shows the finished scene
- feat(signin): on phones the showcase is smaller and the button sits right under the pitch, in view without scrolling

## 2026-11-03 20:30

- feat(settings): daily targets are per profile: saved in your Users row (`target_tasks | target_points | target_minutes`) and loaded at sign-in, so they follow you to every device; cached per account for offline use
- feat(settings): a profile with no saved targets adopts the device's current set once; a change made offline is kept and sent when back online; Settings says where targets are saved
- feat(api): `GET` / `PUT /api/settings` (signed-in only, PUT same-origin, validated, rate limited); local `npm run dev` serves it too

## 2026-11-03 19:30

- feat(auth): the Google profile photo URL is read at sign-in (scope `profile`), kept in the session, shown as the avatar in the header and Settings (initial as fallback), and saved in a new `picture_url` column of the **Users** tab; existing sheets get the header added
- security: only `https://*.googleusercontent.com` photo URLs are accepted (server and browser); the CSP `img-src` allows that host and nothing else new

## 2026-11-03 18:30

- feat(points): story points on the Fibonacci scale: 1, 2, 3, 5, 8, 13, 21 (was 1 / 3 / 5); existing tasks keep their points
- feat(points): the row menu's point chips wrap on phones and the chosen one is clearly highlighted; the daily SP target now goes up to 100

## 2026-11-03 17:30

- fix(api): every function crashed on Vercel (`500 FUNCTION_INVOCATION_FAILED`), so the login page never showed: extensionless relative imports fail in Node ES modules. Imports now end in `.js`; a test enforces it

## 2026-11-03 16:30

- feat(dev): `npm run dev` serves the real `api/` functions with secrets from `.env.local`, so Google sign-in and the sheet can be tried locally without the Vercel CLI (dev only; a test keeps the route list in step with `api/`)

## 2026-11-03 15:00

- feat(sheets): every task is a row in the **Tasks** tab: task_id, user, title, quadrant, story points, status, created, start, end, pauses, paused / actual / span minutes, readable actual and span ("1h 30m", "2h 00m"), updated
- feat(sync): offline-first sync: changes are stamped on the device, pushed ~2s later, when back online and when the app returns; failures retry with backoff; deletes mark the row `deleted`
- feat(sync): sync chip in the header (Synced / Syncing / Offline · n waiting / Retry / Sign in again / Sheet not set up)
- security: `/api/tasks` is same-origin, session-only, rate limited, size-capped; the email comes from the session; nobody can overwrite or delete another person's rows

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
