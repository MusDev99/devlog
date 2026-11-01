# Feature: Free to run, no AI

Owner decision (2026-11-01): DevLog must cost nothing to run and needs no API key. The AI standup and the Google sign-in that guarded it are removed.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | No `api/` folder, no server function, no environment variable | Repo tree, `.env.example` gone |
| AC2 | No AI dependency: `@anthropic-ai/sdk`, `zod` and `esbuild` removed; only `preact` at runtime | `package.json`, `npm audit --omit=dev` |
| AC3 | Build standup works offline from tags and never calls the network | `StandupCard.tsx` uses `ruleStandup`; golden set test |
| AC4 | A deploy serves no API | `npm run smoke` check "no server functions" (404/405) |
| AC5 | Notes written before stay readable | Store and `Note` shape unchanged |

## Laws of UX

| Law | Where |
|---|---|
| Occam's razor | One way to build a standup; no sign-in or AI state to explain |
| Doherty | Standup builds instantly on the phone, no network wait |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A01 / A07 Access, auth | Attack surface removed: no endpoints, cookies or OAuth flow |
| A02 Crypto / secrets | No secrets exist to leak |
