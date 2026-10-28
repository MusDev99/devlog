# Changelog

## 2026-10-29 00:17 · v0.4.0

- feat(auth): Google sign-in (OIDC + PKCE) with an email allow-list replaces the shared passcode for the AI standup
- feat: account line on the standup card ("AI on · email" / Sign in with Google / Sign out) and a sign-in result toast
- security: signed `HttpOnly` cookies, same-origin check on cookie-authenticated requests, per-account rate limit, fail closed without config
- test: auth tests (ID token checks, cookie tampering, PKCE vector, limiter); `npm run eval` now calls Claude directly
- docs: Google OAuth setup, new environment variables, OWASP audit

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
