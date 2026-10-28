# Feature: DevLog scaffold (Week 1)

Spec v0 approved by mus on 2026-10-28 ([brainstorm + spec doc](https://claude.ai/artifact/1JApbbis2nR3qpUiNL2Lwe)).

## 1 · Decision

DevLog chosen over DevFlash, HabitPilot, MakanSnap, ReplyPal and LogLens: used every workday, offline-first by nature, AI step easy to evaluate. Defaults accepted: repo `MusDev99/devlog` (public), Google sign-in with allow-list for the AI function, browser speech-to-text for voice.

## 2 · Plan (5 weeks)

| Week | Slice | Gate |
|---|---|---|
| 1 | Scaffold: PWA shell, CI, rules | CI green, installs on the phone |
| 2 | Offline capture (IndexedDB, tags, voice) | Full day captured in airplane mode |
| 3 | AI standup + fallback + golden set | Golden set passes, no invented items |
| 4 | Hardening (sign-in, rate limit, injection tests) | Audit has no High findings |
| 5 | Friday recap, copy, v1.0.0 | Used 5 workdays in a row |

## 3 · Acceptance criteria (this slice)

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Given a production build, when opened once online and then offline, the app still loads | Playwright run, offline screenshot |
| AC2 | API calls and non-GET requests are never cached | `tests/sw-policy.test.ts` |
| AC3 | Every file the service worker and manifest reference exists | `tests/sw-assets.test.ts` |
| AC4 | No horizontal scroll at 375px | `scrollWidth === 375` |
| AC5 | `npm run verify` passes in CI | `ci / verify` |

## 4 · Laws of UX applied

| Law | Where |
|---|---|
| Jakob | Familiar card layout, standard install flow |
| Doherty | Static shell from cache, ~7 kB gzipped JS |
| Aesthetic-Usability | One token set, one radius, one accent |
| Accessibility | Status pill has text, not just colour; visible focus ring; reduced motion respected |

## 5 · OWASP notes

| Risk | Mitigation |
|---|---|
| A05 Misconfiguration | Strict CSP + security headers in `vercel.json` |
| A06 Components | Exact versions, lockfile, `npm audit --omit=dev` in CI |
| A08 Integrity | No third-party scripts or CDNs |
