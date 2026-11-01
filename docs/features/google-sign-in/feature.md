# Feature: Google sign-in for the AI standup (Week 4)

Roadmap slice 4 (hardening). Gate: passcode gone, AI needs an allow-listed Google account, fail closed, audit clean.

## Decision

| Option | Verdict |
|---|---|
| Keep the shared passcode | ❌ one leaked string = anyone spends the API key; no per-person limit |
| Auth library (NextAuth / Auth.js) | ❌ framework-shaped, more dependencies than the problem needs |
| **Hand-rolled OIDC (code + PKCE), Web Crypto only** | ✅ same proven pattern as WorkForce, zero new runtime dependencies, unit-tested |

Sign-in gates only the AI. Notes stay on the phone and never need an account.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Allow-listed account signs in → session cookie, `?signin=ok`, "AI on · email" | bundled handlers vs fake Google, Playwright |
| AC2 | Account not on the list, wrong `state`, bad token → `?signin=denied`, no session | fake Google run |
| AC3 | ID token checks: RS256 signature, `kid`, `iss`, `aud`, `exp`, `nonce`, `email_verified` | `tests/auth.test.ts` (one case per check) |
| AC4 | OAuth cookie can't be used as a session and vice versa; tampered or expired cookies fail | `tests/auth.test.ts` |
| AC5 | `/api/standup` without session → 401, cross-site → 403, signed in → 200 | fake Google + fake Claude run |
| AC6 | Any sign-in variable missing → 503 on `/api/auth/*` and `/api/standup`; the app shows rules | `tests/auth.test.ts`, fake run |
| AC7 | Sign out clears the cookie (same-origin only) | fake run |

## Laws of UX

| Law | Where |
|---|---|
| Jakob | Standard "Sign in with Google" link, familiar account line with Sign out |
| Hick | No settings panel any more: one link when signed out, one when signed in |
| Tesler | No passcode to type or remember |
| Peak-End | Toast after sign-in: "Signed in, AI standups are on" or "Sign-in not allowed for this account" |

## OWASP notes

See `docs/audits/2026-10-28-audit.md`.
