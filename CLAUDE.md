# CLAUDE.md

DevLog: offline-first mobile PWA. A Pomodoro focus timer (Focus 25 / Short Break 5 / Long Break 15) beside Session Tasks on an Eisenhower matrix (urgent × important, plus Unsorted), with story-point sizes (1 / 3 / 5), 🍅 counts per task, and a standup each morning plus a Friday recap, all on the phone. Static site: no server functions, no AI, no API keys. Vite 7 + Preact 10 + Tailwind 4 + strict TypeScript, deployed on Vercel. Process and standards: [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md).

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
- **Tasks stay on the device**: a task is a `Note`: `tag` = status (To do / Doing / Blocked / Done), optional `quadrant` = place (`unsorted` or a quadrant; absent reads as `schedule`; new tasks start `unsorted`), `size` (1 / 3 / 5 SP, absent reads as 1), `pomodoros` + `spentMs` credited by finished focus rounds (`startedAt` is a legacy field, read and ignored). IndexedDB `devlog` / store `notes` (keyPath `id`, index `day`), accessed only through `src/lib/db.ts` (`allNotes` loads everything; it also owns the small `localStorage` keys). Rows are validated with `isNote` on read (corrupt rows skipped). Task rules (`TAGS`, `QUADRANTS`, `PLACES`, `SIZES`, prefixes, `moveNote`, `creditPomodoro`, max length) live in `src/lib/notes.ts`; never hardcode them elsewhere. `day` = `YYYY-MM-DD` in the user's zone of the last status change (re-sorting quadrants does not count), `createdAt` / `movedAt` = ISO UTC. No server storage, no analytics.
- **Pomodoro**: `src/lib/pomodoro.ts` (pure, tested) + `TimerPanel.tsx`. One session: mode, focus task, `endsAt` while running (wall clock, so it survives reloads and sleeping tabs) or `remainingMs` when paused, and `rounds` (long break every 4). A finished focus round credits the focus task once (`creditPomodoro`) and moves to a break; starting focus on a To do / Blocked task makes it Doing. The session is kept in `localStorage` through `loadSession` / `saveSession` in `db.ts`; the UI ticks once a second only while running.
- **Session Tasks**: `src/lib/matrix.ts` (pure, tested: Unsorted then Q1–Q4, open work first then this week's done crossed out in place, older done only in List → Earlier, done/total badge) + `SessionTasks.tsx` / `TaskRow.tsx` / `Composer.tsx`. List or Matrix view (per-device pref via `loadPref` / `savePref`). Drag a row with the mouse (6px threshold) or long-press 350 ms on touch (a swipe still scrolls), dropping on any `data-drop` element; the row menu does every move without dragging. Layout: ≥ 1024px timer and tasks side by side, quadrants 2×2 from 768px, stacked below.
- **PWA**: `public/sw.js` + pure routing rules in `public/sw-policy.js` (tested). `/assets/*` and `/icons/*` cache-first, pages network-first with cached shell offline, `/api/*` (none today) and non-GET never cached. `build/sw-assets.ts` writes `sw-assets.json` (hashed files to precache). New shell file → add to `SHELL` in `sw.js` (test fails otherwise). Bump `VERSION` when caching rules change.
- **Standup**: `ruleStandup(cards, today)` in `src/lib/standup.ts` (pure, tested) + `StandupCard.tsx`. Yesterday = done/doing cards changed on the last earlier active day; Today = done today + everything in Doing; Blockers = everything in Blocked. No AI, no network: nothing leaves the device.
- **Friday recap**: `src/lib/recap.ts` (pure, tested) + `RecapCard.tsx`; cards changed Monday → today. Rules only, never sent to the server.
- `src/` and `tests/` import with `.ts` extensions (Node strip-types). No `api/` folder: adding a server function, AI call or API key is a product decision, not a refactor.
- Golden set: `tests/golden/standup-cases.json`; unit tests check the rules keep every blocker and invent nothing.

## Rules

- Strict TypeScript: no `any`, no `@ts-ignore`. No `dangerouslySetInnerHTML`.
- Design tokens only (`@theme` in `src/styles.css`); no raw hex in components.
- Mobile-first: 375px, no horizontal scroll, touch targets ≥ 44px, respect `prefers-reduced-motion`. Apply the [Laws of UX](https://lawsofux.com/) and name the law in the PR.
- Security headers/CSP live in `vercel.json`. A new external host (API, font, CDN) must be added to the CSP deliberately.
- No secrets or env variables are needed; never commit `.env*`.
- Exact dependency versions; commit `package-lock.json`; `npm audit --omit=dev` before each release.

## Git

Never commit to `main`. Branches `feat/` `fix/` `chore/` `docs/` (agent sessions may use their given `claude/` branch). Conventional Commits for commits and PR titles (checked by `branch-policy.yml`); merged branches are deleted by `branch-cleanup.yml`. Squash merge, one concern per PR, under ~400 changed lines. CI `verify` + `branch-policy` must be green. SemVer tags `vX.Y.Z`.
