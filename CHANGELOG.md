# Changelog

## 2026-10-28 23:44 · v0.2.0

- feat: quick notes tagged done / doing / blocker, saved in IndexedDB on the device (works offline)
- feat: tag prefixes (`b:`, `done:`, `wip:`) are lifted into the tag; voice dictation where the browser supports it
- feat: today view grouped by tag, delete with 5-second undo, loading and storage-error states

## 2026-10-28 22:54 · v0.1.0

- feat: project scaffold (Vite 7 + Preact 10 + Tailwind 4, strict TypeScript)
- feat: installable PWA that launches offline (manifest, icons, service worker with tested routing rules)
- ci: `verify` (typecheck + tests + build + audit) and `branch-policy` workflows, PR template
- docs: CLAUDE.md, README, feature spec for the scaffold
