# Release: v1.0.0 (Week 5b)

Roadmap slice 5b. Gate: post-deploy smoke check, Laws of UX review of every screen, audit clean, all features on `main`.

## Scope

| Item | Where |
|---|---|
| 🚦 Post-deploy smoke check | `npm run smoke -- <url>` (`scripts/smoke.ts`, logic in `scripts/smoke-checks.ts`, tested in `tests/smoke.test.ts`) |
| 🧭 Laws of UX + accessibility review | this file |
| 🔖 Version 1.0.0, CHANGELOG, README | repo root |

## Smoke check

Six checks against a live deploy. Each passes with sign-in configured **or** with AI off (503), so it is safe to run on any deploy.

| Check | Pass |
|---|---|
| Home page + security headers | 200 with CSP `default-src 'self'`, `nosniff`, HSTS, Referrer-Policy |
| PWA files | manifest and `sw.js` 200, `sw.js` not cached |
| Session without cookie | 401 / 503, `no-store` |
| Standup, cross-site | 403 / 503 (never 200) |
| Standup, no session | 401 / 403 / 503 (never 200) |
| Sign-in | 302 to `accounts.google.com` with PKCE S256 and an `HttpOnly; Secure` cookie, or 503 |

Run against local `vite preview` it fails 5 of 6 by design (no `vercel.json` headers, no functions): proof that it catches a broken deploy.

## Laws of UX review (375px, measured with Playwright)

| Law | Check | Result |
|---|---|---|
| Fitts | Every button, link and field ≥ 44×44 px; Add and the composer sit at the bottom, in thumb reach | ✅ 0 targets under 44 px |
| Hick | One primary action (Add); standup is one button; recap opens itself only Fri–Sun; no settings screen | ✅ |
| Jakob | Bottom composer like chat apps, chips for tags, standard Google sign-in, undo toast | ✅ |
| Miller | Notes grouped by tag; standup and recap in three chunks with counts | ✅ |
| Doherty | Notes save locally; rules answer instantly; AI shows "Building…" with a 25 s ceiling and a rules fallback | ✅ |
| Von Restorff | Add is the only filled accent; everything else is outline | ✅ |
| Peak-End | Toasts for copy, sign-in result, delete + undo | ✅ |
| Tesler | Previous workday and week range found automatically; tag prefixes (`b:`, `done:`) parsed for you | ✅ |
| Postel | Prefixes in any case, extra spaces collapsed; strict storage shape (`isNote`) | ✅ |

## Accessibility

| Check | Result |
|---|---|
| Contrast (WCAG AA 4.5:1) | text 15.8, muted 6.5, accent 5.6, Add label 6.2, online 8.3, offline 8.6 ✅ |
| Labels | every input has a label or `aria-label` ✅ |
| Keyboard | Tab reaches every control in reading order; visible focus ring ✅ |
| Reduced motion | 0 animations running with `prefers-reduced-motion: reduce` ✅ |
| Status not by colour alone | online/offline pill and tags always carry text ✅ |
| Horizontal scroll at 375px | none ✅ |

## Release checks

| Gate | Result |
|---|---|
| `npm run verify` | ✅ 40 tests, typecheck, build |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| OWASP audit | `docs/audits/2026-10-28-audit.md` still holds: no auth, endpoint or header change since |
| Live checks (owner, after deploy) | `npm run smoke -- <prod url>`; with the key set, `npm run eval` |

## After merge (owner)

1. Tag the merge commit: `git tag v1.0.0 && git push origin v1.0.0` (or a GitHub release named v1.0.0).
2. `npm run smoke -- https://<your-devlog>.vercel.app`.
3. With the env vars set, sign in on your phone, then `ANTHROPIC_API_KEY=... npm run eval`.
