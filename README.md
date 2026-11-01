# 🎙️ DevLog

A personal kanban board on your phone (To do / Doing / Blocked / Done) that turns into a ready-to-paste standup each morning. Offline-first PWA, notes stay on your device. Free to run: a static site with no server, no AI and no API keys.

## ✨ Features

| Feature | Status |
|---|---|
| 📱 Installable PWA, launches offline | ✅ v0.1 |
| 📝 Quick notes (text + voice), tagged done / doing / blocker, offline | ✅ v0.2 |
| 📋 Standup (yesterday / today / blockers) built on the phone from tags, one-tap copy | ✅ v0.3 |
| 📅 Friday recap (shipped / in progress / blockers), offline, one-tap copy | ✅ v0.5 |
| 🚦 Post-deploy smoke check, Laws of UX review | ✅ v1.0 |
| 💸 No AI, no sign-in, no API keys: static site, free to host | ✅ v2.0 |
| 🗂️ Kanban board: To do / Doing / Blocked / Done, drag and drop on desktop, one-tap moves on the phone | ✅ v2.0 |

## 🚀 Quick start

```bash
npm ci
npm run dev       # http://localhost:5173
npm run verify    # typecheck + tests + build
npm run smoke -- https://<deploy>   # post-deploy checks (headers, PWA files, no server functions)
```

Node 22.18+ (tests run TypeScript directly with `node --test`).

## 🗂️ Structure

| Path | What |
|---|---|
| `src/App.tsx` | Main screen |
| `src/components/` | `Board` (kanban columns and cards), `Composer` (add a card), `StandupCard`, `RecapCard` (week recap), `Icon` (inline Material icons) |
| `src/styles.css` | Material Design 3 colour roles as Tailwind `@theme` tokens, `state-layer` utility |
| `tests/golden/` | Standup golden set (10 note days): the rules keep every blocker and invent nothing |
| `src/lib/` | Pure logic (`notes.ts`, `board.ts`, `standup.ts`, `recap.ts`, `today.ts`), `db.ts` (IndexedDB, the only storage module), `speech.ts`, PWA helpers |
| `public/sw.js`, `public/sw-policy.js` | Service worker and its tested routing rules |
| `build/sw-assets.ts` | Vite plugin: list of hashed files to precache |
| `vercel.json` | Security headers, CSP, cache headers |
| `docs/features/` | One `feature.md` per feature |
| `.claude/agents/`, `.claude/commands/team.md` | Agent team: Product Owner, Project Manager, Software Engineer, QA, DevOps |
| `.agents/skills/code-review/` | Shared code-review checklist, findings by severity |

## 💡 Tips

- New cards go to the selected column. Start with `todo:`, `wip:`, `b:` (blocked) or `done:` to send one elsewhere.
- Tap → on a card to move it on (To do → Doing → Done, Blocked → Doing), or ⋮ for any column or Delete. On a wide screen, drag cards between columns.
- Done cards older than a week fold into **Earlier**.
- Start the day with **Build standup**, then **Copy** into your team chat.
- On Friday the **Friday recap** opens by itself (shipped / in progress / blockers for the week); other days tap **Week so far**.
- Voice uses the browser's own speech service (Chrome/Safari); the mic button hides where it is missing.

## ☁️ Deploy (Vercel)

1. Import the repo in Vercel (framework preset: Vite, it reads `vercel.json`).
2. Production branch `main`; every PR gets a preview URL.
3. No environment variables, keys or functions: Vercel serves `dist/` as static files, which fits the free Hobby plan. Any static host works (Netlify, Cloudflare Pages, GitHub Pages); copy the headers from `vercel.json`.
4. Check the deploy: `npm run smoke -- https://<deploy>` (3 checks, exits 1 on failure).

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

Pick up an unfinished run with `/team resume <slug>`. Each run logs role, task, round and outcome to `docs/features/<slug>/runs.md`, and QA reviews with the shared checklist in `.agents/skills/code-review/SKILL.md`.

Agents can't read `.env`, push to `main`, force-push or merge (`.claude/settings.json`). See `docs/features/agent-team/feature.md`.

## 🌿 Contributing

Follows [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md): `feat/*` branches, Conventional Commit PR titles, squash merge, `npm run verify` green. `branch-cleanup.yml` deletes the branch once its PR is merged (keep *Automatically delete head branches* on too). See [CHANGELOG.md](CHANGELOG.md).
