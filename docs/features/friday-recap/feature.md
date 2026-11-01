# Feature: Friday recap (Week 5)

Roadmap slice 5a. Gate: a week of notes becomes a paste-ready recap, offline, nothing sent anywhere.

## Decision

| Option | Verdict |
|---|---|
| AI recap through `/api/standup` | ❌ for v1.0: sends a whole week of notes, more cost and a new prompt to ground; revisit after the live eval |
| **Tag rules on the phone** | ✅ instant, offline, private; same rules people already trust in the standup |

## Rules

| Section | From |
|---|---|
| Shipped | `done` notes, unique (case-insensitive), oldest first |
| In progress | `doing` notes never later logged as `done` with the same text |
| Blockers | every `blocker` note of the week |
| Range | Monday of the current week → today (Sunday still recaps its own week) |

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Friday, Saturday, Sunday: the recap card is open by itself | Playwright (Friday) |
| AC2 | Monday–Thursday: one "Week so far" row that opens the card; Hide closes it | Playwright (Tuesday) |
| AC3 | Last week's notes and notes after today are left out | Playwright seed, `tests/recap.test.ts` |
| AC4 | Adding a note updates the open recap; works offline | Playwright (offline) |
| AC5 | Copy recap gives a paste-ready text with the range and days logged | Playwright clipboard read |
| AC6 | Empty week shows a friendly empty state; storage error shows an alert | code + manual |

## Laws of UX

| Law | Where |
|---|---|
| Hick | Recap opens itself only at the end of the week; other days it is one row |
| Miller | Three chunks with counts (Shipped · 3, In progress · 0, Blockers · 1) |
| Von Restorff | Copy is an outline button; Add stays the one filled accent |
| Peak-End | "Week recap copied" toast closes the week |
| Doherty | Built locally from IndexedDB, no network wait |
