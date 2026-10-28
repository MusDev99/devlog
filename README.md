# 🎙️ DevLog

Jot work notes on your phone during the day, get a ready-to-paste standup each morning. Offline-first PWA, notes stay on your device.

## ✨ Features

| Feature | Status |
|---|---|
| 📱 Installable PWA, launches offline | ✅ v0.1 |
| 📝 Quick notes (text + voice), tagged done / doing / blocker, offline | ✅ v0.2 |
| 🤖 AI standup (yesterday / today / blockers) with rule-based fallback, one-tap copy | ✅ v0.3 |
| 🔒 Sign-in on the AI function, rate limit, spend cap | 🛠️ Week 4 |
| 📅 Friday recap, one-tap copy | 🛠️ Week 5 |

## 🚀 Quick start

```bash
npm ci
npm run dev       # http://localhost:5173
npm run verify    # typecheck + tests + build
```

Node 22.18+ (tests run TypeScript directly with `node --test`).

## 🗂️ Structure

| Path | What |
|---|---|
| `src/App.tsx` | Main screen |
| `src/components/` | `Composer` (add a note), `NoteList` (today, grouped by tag), `StandupCard` |
| `api/standup.ts` | Vercel function: session check, limits, grounding |
| `api/_lib/standup-model.ts` | The one Claude call (shared with `npm run eval`) |
| `api/auth/*`, `api/_lib/auth.ts` | Google sign-in (OIDC + PKCE), signed session cookie, allow-list |
| `tests/golden/` | Standup golden set (10 note days), used by tests and `npm run eval` |
| `src/lib/` | Pure logic (`notes.ts`, `standup.ts`, `today.ts`), `standup-client.ts` (AI call + fallback), `db.ts` (IndexedDB, the only storage module), `speech.ts`, PWA helpers |
| `public/sw.js`, `public/sw-policy.js` | Service worker and its tested routing rules |
| `build/sw-assets.ts` | Vite plugin: list of hashed files to precache |
| `vercel.json` | Security headers, CSP, cache headers |
| `docs/features/` | One `feature.md` per feature |

## 💡 Tips

- Start a note with `b:` (blocker), `done:` or `wip:` to tag it without tapping.
- Start the day with **Build standup**, then **Copy** into your team chat.
- Voice uses the browser's own speech service (Chrome/Safari); the mic button hides where it is missing.

## ☁️ Deploy (Vercel)

1. Import the repo in Vercel (framework preset: Vite, it reads `vercel.json`).
2. Production branch `main`; every PR gets a preview URL.
3. Environment variables (Production and Preview), see `.env.example`:

| Variable | Required | What |
|---|---|---|
| `ANTHROPIC_API_KEY` | for AI | Claude API key |
| `AUTH_SECRET` | for AI | 32+ random characters (`openssl rand -base64 48`), signs the session cookie |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for AI | Google OAuth client (Web application) |
| `APP_URL` | for AI | Public origin, e.g. `https://devlog.vercel.app` (no trailing slash) |
| `ALLOWED_EMAILS` | for AI | Comma-separated Google accounts allowed to use the AI |
| `STANDUP_MODEL` | no | Model override (default `claude-opus-5-5`) |

Without them the app still works: `/api/standup` returns 503 and standups use the tag rules.

4. Google Cloud → APIs & Services → Credentials → OAuth client → **Authorised redirect URI** `<APP_URL>/api/auth/callback` (one per deploy URL you sign in on).
5. Open the app → **Sign in with Google** under the standup card. Signed out, the app keeps working with rules.
6. Live eval (calls Claude directly, costs credit): `ANTHROPIC_API_KEY=... npm run eval`.

## 🌿 Contributing

Follows [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md): `feat/*` branches, Conventional Commit PR titles, squash merge, `npm run verify` green. See [CHANGELOG.md](CHANGELOG.md).
