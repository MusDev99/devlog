# CLAUDE.md

DevLog: offline-first mobile PWA. A stopwatch for the selected task (Start counts up from 0, Stop keeps the total) beside Tasks on an Eisenhower matrix (urgent × important, plus Unsorted), with story-point sizes (1 / 3 / 5), a Stats screen (daily targets, streaks, 7-day trends, time breakdown, insights), and a standup each morning plus a Friday recap, all on the phone. Static site: no server functions, no AI, no API keys. Vite 7 + Preact 10 + Tailwind 4 + strict TypeScript, deployed on Vercel. Process and standards: [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md).

## Commands

```bash
npm run dev        # dev server (service worker off)
npm run build      # production build to dist/
npm run preview    # serve dist/ (service worker on)
npm test           # node --test, Node 22.18+ (runs .ts directly)
npm run verify     # typecheck + tests + build (= CI, run before every commit)
npm run smoke -- <url>   # post-deploy checks (scripts/smoke-checks.ts, tested)
```

## Working loop (every change)

Plan (goal, files, risks; owner approves) → Gather (read code/docs first) → Act (smallest diff on a branch) → Verify (`npm run verify` + real run at 375px, online and offline) → Record (README + CHANGELOG in the same PR). After three failed Verify rounds, stop and re-plan. Feature specs live in `docs/features/<slug>/feature.md`.

## Architecture

- `src/App.tsx` composes the screen; pure logic lives in `src/lib/*.ts` with tests in `tests/` (inject time, never read the clock inside pure code).
- **Tasks stay on the device**: a task is a `Note`: `tag` = status (To do / Doing / Blocked / Done), optional `quadrant` = place (`unsorted` or a quadrant; absent reads as `schedule`; new tasks start `unsorted`), `size` (1 / 3 / 5 SP, absent reads as 1), `spentMs` (banked stopwatch time) + `startedAt` (while running; at most one task) + `runs` (each finished run's start/end, so stats can date time; time banked before v2.4 has none). `pomodoros` is a legacy v2.2 field, read and ignored. IndexedDB `devlog` / store `notes` (keyPath `id`, index `day`), accessed only through `src/lib/db.ts` (`allNotes` loads everything; it also owns the small `localStorage` keys). Rows are validated with `isNote` on read (corrupt rows skipped). Task rules (`TAGS`, `QUADRANTS`, `PLACES`, `SIZES`, prefixes, `moveNote`, `startTimer` / `stopTimer` / `resetTimer` / `elapsedMs`, max length) live in `src/lib/notes.ts`; never hardcode them elsewhere. `day` = `YYYY-MM-DD` in the user's zone of the last status change (re-sorting quadrants does not count), `createdAt` / `movedAt` / `startedAt` = ISO UTC. No server storage, no analytics.
- **Stopwatch**: per task, one running at a time: `startTimer` stops any other run and makes the task Doing; any status other than Doing stops it; `resetTimer` goes back to 0. Wall clock from `startedAt`, so it survives reloads; the UI ticks once a second only while one runs. `TimerPanel.tsx` shows the selected task (the running one wins; the last pick is a per-device pref). Theme: `data-mode="running"` switches `--color-accent` from coral to teal.
- **Session Tasks**: `src/lib/matrix.ts` (pure, tested: Unsorted then Q1–Q4, open work first then this week's done crossed out in place; Unsorted shows only when it holds tasks or during a drag, older done only in List → Earlier, done/total badge) + `SessionTasks.tsx` / `TaskRow.tsx` (own Start/Stop and elapsed time) / `Composer.tsx` (▶ adds and starts). List or Matrix view (per-device pref via `loadPref` / `savePref`). Drag a row with the mouse (6px threshold) or long-press 350 ms on touch (a swipe still scrolls), dropping on any `data-drop` element; the row menu does every move without dragging. Layout: ≥ 1024px timer and tasks side by side, quadrants 2×2 from 768px, stacked below.
- **PWA**: `public/sw.js` + pure routing rules in `public/sw-policy.js` (tested). `/assets/*` and `/icons/*` cache-first, pages network-first with cached shell offline, `/api/*` (none today) and non-GET never cached. `build/sw-assets.ts` writes `sw-assets.json` (hashed files to precache). New shell file → add to `SHELL` in `sw.js` (test fails otherwise). Bump `VERSION` when caching rules change.
- **Stats**: `src/lib/stats.ts` (pure, tested: `dayStats` dates time by run start in the user zone and points/tasks by done day; `streak` counts back from today or yesterday; `weeklyReview`, `breakdown` by task and quadrant, rule-based `insights` capped at five) + `StatsView.tsx`. Daily targets (`Targets`: tasks, story points, focus minutes; limits in `TARGET_LIMITS`) are set in `SettingsDialog.tsx` (native modal `<dialog>`) and kept through `loadTargets` / `saveTargets` in `db.ts`. "On target" = the day's points reach the SP target.
- **Screens**: phone: Timer / Tasks / Stats tabs; ≥ 1024px: Focus (timer + tasks side by side) / Stats. The choice is a per-device pref.
- **Standup**: `ruleStandup(cards, today)` in `src/lib/standup.ts` (pure, tested) + `Reports.tsx` (Standup / Week tabs, rebuilt live, Copy). Yesterday = done/doing cards changed on the last earlier active day; Today = done today + everything in Doing; Blockers = everything in Blocked. No AI, no network: nothing leaves the device.
- **Friday recap**: `src/lib/recap.ts` (pure, tested) + `Reports.tsx` (Week tab, opens first Friday to Sunday); cards changed Monday → today. Rules only, never sent to the server.
- `src/` and `tests/` import with `.ts` extensions (Node strip-types). No `api/` folder: adding a server function, AI call or API key is a product decision, not a refactor.
- Golden set: `tests/golden/standup-cases.json`; unit tests check the rules keep every blocker and invent nothing.

## Rules

- Strict TypeScript: no `any`, no `@ts-ignore`. No `dangerouslySetInnerHTML`.
- Design tokens only (`@theme` in `src/styles.css`); no raw hex in components.
- Mobile-first: 375px, no horizontal scroll, touch targets ≥ 44px, respect `prefers-reduced-motion` (the global rule in `styles.css` stops all animation). Apply the [Laws of UX](https://lawsofux.com/) and name the law in the PR.
- Motion and feedback: `press` (squeeze on tap), `state-layer` (hover/press tint), `animate-rise` / `animate-pop` / `animate-glow`. Secondary row actions reveal on hover only where hover exists (`[@media(hover:hover)]`); on touch they stay visible.
- Security headers/CSP live in `vercel.json`. A new external host (API, font, CDN) must be added to the CSP deliberately.
- No secrets or env variables are needed; never commit `.env*`.
- Exact dependency versions; commit `package-lock.json`; `npm audit --omit=dev` before each release.

## Git

Never commit to `main`. Branches `feat/` `fix/` `chore/` `docs/` (agent sessions may use their given `claude/` branch). Conventional Commits for commits and PR titles (checked by `branch-policy.yml`); merged branches are deleted by `branch-cleanup.yml`. Squash merge, one concern per PR, under ~400 changed lines. CI `verify` + `branch-policy` must be green. SemVer tags `vX.Y.Z`.
