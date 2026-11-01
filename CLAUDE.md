# CLAUDE.md

DevLog: offline-first mobile PWA. A personal kanban board (To do / Doing / Blocked / Done; add cards by text or voice) that builds a standup each morning plus a Friday recap, on the phone. Static site: no server functions, no AI, no API keys. Vite 7 + Preact 10 + Tailwind 4 + strict TypeScript, deployed on Vercel. Process and standards: [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md).

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
- **Cards stay on the device**: a card is a `Note`; its `tag` is its column. IndexedDB `devlog` / store `notes` (keyPath `id`, index `day`), accessed only through `src/lib/db.ts` (`allNotes` loads the whole board). Rows are validated with `isNote` on read (corrupt rows skipped). Card rules (`TAGS` in column order, prefixes, `NEXT_TAG`, `moveNote`, max length) live in `src/lib/notes.ts`; never hardcode tags elsewhere. `day` = `YYYY-MM-DD` in the user's zone of the last change (added or moved), `createdAt` / `movedAt` = ISO UTC. No server storage, no analytics.
- **Board**: `src/lib/board.ts` (pure, tested: column order, newest change first, Done older than 7 days folds into Earlier) + `Board.tsx`. Phone: one column behind count tabs; ≥ 768px: four columns with drag and drop. Every move also has buttons (next column, menu) so it never needs a drag.
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
