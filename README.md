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
| `api/standup.ts` | Vercel function: passcode, limits, Claude call, grounding |
| `tests/golden/` | Standup golden set (10 note days), used by tests and `npm run eval` |
| `src/lib/` | Pure logic (`notes.ts`, `standup.ts`, `today.ts`), `standup-client.ts` (AI call + fallback), `db.ts` (IndexedDB, the only storage module), `speech.ts`, PWA helpers |
| `public/sw.js`, `public/sw-policy.js` | Service worker and its tested routing rules |
| `build/sw-assets.ts` | Vite plugin: list of hashed files to precache |
| `vercel.json` | Security headers, CSP, cache headers |
| `docs/features/` | One `feature.md` per feature |
| `.claude/agents/`, `.claude/commands/team.md` | Agent team: Product Owner, Project Manager, Software Engineer, QA, DevOps |

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
| `DEVLOG_PASSCODE` | for AI | Long random string; enter the same value in the app under **AI settings** |
| `STANDUP_MODEL` | no | Model override (default `claude-opus-5-5`) |

Without them the app still works: `/api/standup` returns 503 and standups use the tag rules.

4. Live eval after deploy: `DEVLOG_URL=https://<deploy> DEVLOG_PASSCODE=... npm run eval`.

## 🤖 Agent team

Five Claude Code subagents work on this repo like a small team. In Claude Code, run:

```
/team add a button to export today's notes as Markdown
```

| Step | Role | You |
|---|---|---|
| 1 | 🧑‍💼 Product Owner writes `docs/features/<slug>/feature.md` | 🙋 approve the spec |
| 2 | 📋 Project Manager splits it into tasks | |
| 3 | 👩‍💻 Engineer implements, 🧪 QA reviews (max 3 rounds) | |
| 4 | 🚀 DevOps runs the gate and drafts the PR | 🙋 push and squash-merge |

Agents can't read `.env`, push to `main`, force-push or merge (`.claude/settings.json`). See `docs/features/agent-team/feature.md`.

## 🌿 Contributing

Follows [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md): `feat/*` branches, Conventional Commit PR titles, squash merge, `npm run verify` green. See [CHANGELOG.md](CHANGELOG.md).
