# CLAUDE.md

DevLog: offline-first mobile PWA. Jot work notes during the day (text or voice, tagged done / doing / blocker) and get an AI standup each morning plus a Friday recap. Vite 7 + Preact 10 + Tailwind 4 + strict TypeScript, deployed on Vercel. Process and standards: [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md).

## Commands

```bash
npm run dev        # dev server (service worker off)
npm run build      # production build to dist/
npm run preview    # serve dist/ (service worker on)
npm test           # node --test, Node 22.18+ (runs .ts directly)
npm run verify     # typecheck + tests + build (= CI, run before every commit)
```

## Working loop (every change)

Plan (goal, files, risks; owner approves) → Gather (read code/docs first) → Act (smallest diff on a branch) → Verify (`npm run verify` + real run at 375px, online and offline) → Record (README + CHANGELOG in the same PR). After three failed Verify rounds, stop and re-plan. Feature specs live in `docs/features/<slug>/feature.md`.

## Architecture

- `src/App.tsx` composes the screen; pure logic lives in `src/lib/*.ts` with tests in `tests/` (inject time, never read the clock inside pure code).
- **Notes stay on the device**: IndexedDB `devlog` / store `notes` (keyPath `id`, index `day`), accessed only through `src/lib/db.ts`. Rows are validated with `isNote` on read (corrupt rows skipped). Note rules (tags, prefixes, max length) live in `src/lib/notes.ts`; never hardcode tags elsewhere. `day` = `YYYY-MM-DD` in the user's zone at write time, `createdAt` = ISO UTC. No server storage, no analytics.
- **PWA**: `public/sw.js` + pure routing rules in `public/sw-policy.js` (tested). `/assets/*` and `/icons/*` cache-first, pages network-first with cached shell offline, `/api/*` and non-GET never cached. `build/sw-assets.ts` writes `sw-assets.json` (hashed files to precache). New shell file → add to `SHELL` in `sw.js` (test fails otherwise). Bump `VERSION` when caching rules change.
- **AI standup**: `api/standup.ts` (Vercel function) is the only place that calls Claude (`@anthropic-ai/sdk`, structured output via Zod, `effort: low`, server-side refusal fallbacks, model `STANDUP_MODEL`, default `claude-opus-5-5`). Fails closed: 503 without `ANTHROPIC_API_KEY` + `DEVLOG_PASSCODE`; passcode checked in constant time (`api/_lib/guard.ts`); per-instance rate limit; ≤ 60 notes / 4,000 characters. Notes go in as data inside `<notes>` and the prompt says to ignore instructions in them. Output is grounded by `groundStandup` (`src/lib/standup.ts`): items must cite real note refs, blockers must cite blocker notes, missing blockers are added back. Any failure → `ruleStandup` in the browser with the reason shown. The AI only suggests text; the person copies it.
- `api/` files import shared code **extensionless** and only from modules with type-only imports (Vercel bundles them); `src/` and `tests/` use `.ts` extensions (Node strip-types).
- Golden set: `tests/golden/standup-cases.json` (unit tests check the rules on it; `npm run eval` checks the live AI, costs credit, not in CI). Add a case for every AI mistake found.

## Rules

- Strict TypeScript: no `any`, no `@ts-ignore`. No `dangerouslySetInnerHTML`.
- Design tokens only (`@theme` in `src/styles.css`); no raw hex in components.
- Mobile-first: 375px, no horizontal scroll, touch targets ≥ 44px, respect `prefers-reduced-motion`. Apply the [Laws of UX](https://lawsofux.com/) and name the law in the PR.
- Security headers/CSP live in `vercel.json`. A new external host (API, font, CDN) must be added to the CSP deliberately.
- Secrets only in env; never commit `.env*`. Document new variables in `.env.example`.
- Exact dependency versions; commit `package-lock.json`; `npm audit --omit=dev` before each release.

## Git

Never commit to `main`. Branches `feat/` `fix/` `chore/` `docs/` (agent sessions may use their given `claude/` branch). Conventional Commits for commits and PR titles (checked by `branch-policy.yml`); merged branches are deleted by `branch-cleanup.yml`. Squash merge, one concern per PR, under ~400 changed lines. CI `verify` + `branch-policy` must be green. SemVer tags `vX.Y.Z`.
