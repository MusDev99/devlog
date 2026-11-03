# 🎙️ DevLog

Sign in with Google, time each task (actual vs span), sort them on an urgent × important (Eisenhower) matrix, and keep a record in your team's Google Sheet. Turns into a ready-to-paste standup each morning. Offline-first PWA, notes stay on your device. Free to run: a static site with no server, no AI and no API keys.

## ✨ Features

| Feature | Status |
|---|---|
| 📱 Installable PWA, launches offline | ✅ v0.1 |
| 📝 Quick notes (text + voice), tagged done / doing / blocker, offline | ✅ v0.2 |
| 📋 Standup (yesterday / today / blockers) built on the phone from tags, one-tap copy | ✅ v0.3 |
| 📅 Friday recap (shipped / in progress / blockers), offline, one-tap copy | ✅ v0.5 |
| 🚦 Post-deploy smoke check, Laws of UX review | ✅ v1.0 |
| 💸 No AI, no sign-in, no API keys: static site, free to host | ✅ v2.0 |
| 🗂️ Kanban board: To do / Doing / Blocked / Done, drag and drop on desktop, one-tap moves on the phone | ✅ v2.0 (replaced in v2.1) |
| 🧭 Eisenhower dashboard (Do first / Schedule / Delegate / Eliminate), drag by touch or mouse, T-shirt sizes S 1 / M 3 / L 5, one start/stop timer at a time | ✅ v2.1 (redesigned in v2.2) |
| 🍅 Pomodoro (Focus 25 / Short 5 / Long 15), Session Tasks with Unsorted, List / Matrix, story points 1 / 3 / 5 | ✅ v2.2 (timer replaced in v2.3) |
| ⏱️ Stopwatch per task (Start counts up from 0, Stop keeps the total), lean UI: colour by state, one big Start/Stop, live reports, mini player, keyboard shortcuts | ✅ v2.3 |
| 📊 Stats: daily targets (tasks, story points, focus time), streaks, last 7 days by time / points / tasks, weekly review, time by quadrant and task, insights | ✅ v2.4 |
| 📲 Mobile-first PWA: bottom tab bar, Install button (iPhone: Add to Home Screen hint), app shortcuts, update prompt, icon badge, persistent storage, fully offline launch | ✅ v2.5 |
| 🔐 Google sign-in (required, self-registration), Users tab in the team's Google Sheet, per-account data on the device | ✅ v2.6 |

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
| `src/Root.tsx`, `src/App.tsx` | Sign-in gate, main screen |
| `src/components/` | `TimerPanel` (stopwatch ring), `SessionTasks` (List / Matrix, Unsorted, drag), `TaskRow` (Start/Stop per task), `Composer` (add row), `Reports` (Standup / Week), `StatsView`, `SettingsDialog` (daily targets), `Icon` |
| `src/styles.css` | Material Design 3 colour roles as Tailwind `@theme` tokens, `state-layer` utility |
| `api/auth/*`, `api/_lib/auth.ts` | Google sign-in (OIDC + PKCE), signed session cookie |
| `api/_lib/sheets.ts` | Google Sheets as a service account (RAW writes), Users tab |
| `tests/golden/` | Standup golden set (10 note days): the rules keep every blocker and invent nothing |
| `src/lib/` | Pure logic (`notes.ts` incl. the stopwatch, `matrix.ts`, `stats.ts`, `standup.ts`, `recap.ts`, `today.ts`), `db.ts` (IndexedDB, the only storage module), `speech.ts`, PWA helpers |
| `public/sw.js`, `public/sw-policy.js` | Service worker and its tested routing rules |
| `build/sw-assets.ts` | Vite plugin: list of hashed files to precache |
| `vercel.json` | Security headers, CSP, cache headers |
| `docs/features/` | One `feature.md` per feature |
| `.claude/agents/`, `.claude/commands/team.md` | Agent team: Product Owner, Project Manager, Software Engineer, QA, DevOps |
| `.agents/skills/code-review/` | Shared code-review checklist, findings by severity |

## 💡 Tips

- **Install it**: Android / desktop Chrome or Edge show **Install** in the header. On iPhone or iPad, tap **Share → Add to Home Screen**. Installed, it opens full screen, works offline, shows open tasks on its icon, and long-pressing the icon offers **Timer**, **Add task** and **Stats**.
- A new version shows **New version ready · Reload**; nothing changes under you until you tap it.

- New tasks land in **Unsorted** (it hides when empty); pick their size (1 / 3 / 5 SP) before adding. ▶ next to the field adds a task and starts its stopwatch. `wip:`, `b:` (blocked) or `done:` set the status.
- Drag a task onto a quadrant with the mouse, or long-press then drag on a phone. ⋮ moves it without dragging and changes size, status or deletes.
- Every task has its own ▶ / ⏸. **Start** counts up from 0, **Pause** keeps the total, **Resume** carries on, ✓ **Finish** ends it. Two readings: **actual** (time the clock ran) and **span** (first start to finish, pauses included): 11:00 → 13:00 with three 10-minute pauses is 1h 30m actual, 2h span. Only one runs at a time; starting another pauses the first. The big clock shows the selected task with Reset (undoable) beside it. While a clock runs, the app turns teal.
- Keyboard: **Space** start/stop the selected task, **N** new task. On a phone, a mini player with Stop sticks to the bottom once you scroll.
- **Reports**: Standup and Week tabs update live; **Copy** pastes them into chat.
- **Stats** (tab): rings for today's story points, tasks and focus time against your targets; 🔥 days in a row with activity and 🎯 days in a row on your SP target; the last 7 days as Time / Points / Tasks; where your time went by quadrant and task (with minutes per story point); and plain-language insights. Set the targets with ⚙.
- Tick the circle to finish a task: it stays crossed out in its quadrant for a week, then moves to **List → Done earlier**.
- Start the day with **Build standup**, then **Copy** into your team chat.
- On Friday the **Friday recap** opens by itself (shipped / in progress / blockers for the week); other days tap **Week so far**.
- Voice uses the browser's own speech service (Chrome/Safari); the mic button hides where it is missing.

## ☁️ Deploy (Vercel)

1. Import the repo in Vercel (framework preset: Vite, it reads `vercel.json`). Production branch `main`; every PR gets a preview URL. Free Hobby plan is enough.
2. **Google sign-in**: Google Cloud → APIs & Services → OAuth consent screen, then Credentials → **OAuth client (Web application)** with redirect URI `<APP_URL>/api/auth/callback` (one per deploy URL you sign in on).
3. **Google Sheet**: enable the **Google Sheets API**; IAM → **Service accounts** → create one → Keys → add a JSON key. Create a spreadsheet and **share it with the service-account email as Editor**. The app creates the **Users** tab and its header row on first sign-in.
4. Environment variables (Production and Preview), see `.env.example`:

| Variable | Required | What |
|---|---|---|
| `AUTH_SECRET` | yes | 32+ random characters (`openssl rand -base64 48`), signs the session cookie |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes | OAuth client from step 2 |
| `APP_URL` | yes | Public origin, e.g. `https://devlog.vercel.app` (no trailing slash) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` | for the sheet | From the JSON key (`client_email`, `private_key`; keep `\n` on one line) |
| `SHEET_ID` | for the sheet | The id in `docs.google.com/spreadsheets/d/<SHEET_ID>/edit` |
| `ALLOWED_EMAILS` | no | Comma-separated emails allowed to sign in; empty = anyone with a Google account registers |

Without the sign-in variables `/api/auth/*` return 503 and the app runs local-only (nothing syncs). Without the sheet variables sign-in still works but nothing is written.

5. Check the deploy: `npm run smoke -- https://<deploy>` (3 checks, exits 1 on failure).

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
