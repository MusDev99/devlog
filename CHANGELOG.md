# Changelog

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
