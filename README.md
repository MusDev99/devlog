# 🎙️ DevLog

Jot work notes on your phone during the day, get a ready-to-paste standup each morning. Offline-first PWA, notes stay on your device.

## ✨ Features

| Feature | Status |
|---|---|
| 📱 Installable PWA, launches offline | ✅ v0.1 |
| 📝 Quick notes (text + voice), tagged done / doing / blocker | 🛠️ Week 2 |
| 🤖 AI standup (yesterday / today / blockers) with rule-based fallback | 🛠️ Week 3 |
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
| `src/lib/` | Pure logic (dates) and PWA helpers |
| `public/sw.js`, `public/sw-policy.js` | Service worker and its tested routing rules |
| `build/sw-assets.ts` | Vite plugin: list of hashed files to precache |
| `vercel.json` | Security headers, CSP, cache headers |
| `docs/features/` | One `feature.md` per feature |

## ☁️ Deploy (Vercel)

1. Import the repo in Vercel (framework preset: Vite, it reads `vercel.json`).
2. Production branch `main`; every PR gets a preview URL.
3. No environment variables needed yet (the AI key arrives in Week 3).

## 🌿 Contributing

Follows [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md): `feat/*` branches, Conventional Commit PR titles, squash merge, `npm run verify` green. See [CHANGELOG.md](CHANGELOG.md).
