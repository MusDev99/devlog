# Feature: Pomodoro redesign

Owner request (2026-11-02): "the design is not nice", with a reference screenshot: a Pomodoro timer panel beside Session Tasks (add row with story points, List / Matrix, Unsorted, tinted Q1–Q4, compact rows with 🍅). Decisions: Pomodoro replaces the per-task stopwatch; new tasks land in Unsorted.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Timer has Focus 25 / Short Break 5 / Long Break 15; Start, Pause / Resume, Reset; a ring fills as the round runs | `pomodoro.test.ts`; manual run |
| AC2 | Tapping a task makes it the focus task; starting focus marks a To do / Blocked task Doing | Manual run: chip, row outline, status |
| AC3 | A finished focus round adds exactly one 🍅 and 25 min to the focus task and moves to a break; every 4th break is long | `complete` test; manual run: end time in the past + reload, credited once, second reload no double credit |
| AC4 | A running timer survives a reload; the tab title shows the time | Manual run |
| AC5 | New tasks land in Unsorted with the chosen size (1 / 3 / 5 SP); 🍅 adds and focuses | Manual run |
| AC6 | Rows drag onto Unsorted or a quadrant with the mouse, or by long-press on touch; a swipe still scrolls; the ⋮ menu moves without dragging | Manual run (mouse drag; scripted touch pointer events) |
| AC7 | Done tasks stay crossed out in place for 7 days, then only in List → Done earlier; badge shows done/total | `matrix.test.ts` |
| AC8 | Old tasks keep working: no place → Schedule; legacy `startedAt` read and ignored | `isNote`, `placeOf` tests |
| AC9 | No horizontal scroll at 375px, touch targets ≥ 44px | `scrollWidth === 375` (fixed a 479px overflow), target scan |

## Laws of UX

| Law | Where |
|---|---|
| Fitts | Start / Pause is the largest target; 🍅 adds and focuses in one tap; full-width input on phones |
| Hick | Three timer modes, three sizes; new tasks need no quadrant decision until you sort them |
| Goal-gradient | Ring fills and round dots show progress toward the long break |
| Zeigarnik | Unsorted keeps unplaced work visible until it is sorted |
| Von Restorff | Focus task outlined; Start / Pause and + are the only filled buttons |
| Peak-End | Round-end toast with the 🍅 earned; Undo after moves and deletes |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A03 Injection | Task text rendered as text; drag carries the task in memory only |
| A04 Design | Session in `localStorage`, validated with `isSession` on read; nothing leaves the device |
