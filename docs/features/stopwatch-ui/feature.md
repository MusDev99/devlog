# Feature: Stopwatch per task and lean UI

Owner requests (2026-11-02): "revamp the UI by implementing UI/UX laws, lean and seamless design, proper colour grading, button placement, interactive UI", then "for each activity selected, a start and stop button … I don't want the Pomodoro concept, it counts total elapsed from 0 (start) until finish (stop)".

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Start counts up from 0 for a new task; Stop keeps the total; Start again continues from the total | `notes.test.ts` (`startTimer`, `stopTimer`, `elapsedMs`); manual run: stop 00:30, resume 00:32 |
| AC2 | Every task row has its own Start/Stop; only one runs; starting another stops and banks the first | `startTimer` test; manual run: one `Stop timer` button at a time |
| AC3 | The big clock shows the selected task (the running one wins), with Reset (undoable) and Done beside Start/Stop | Manual run: reset → 00:00, Undo → back; Done → task done, clock cleared |
| AC4 | A running stopwatch survives a reload; the tab title shows its time | Manual run |
| AC5 | Colour follows state: coral idle, teal running | `data-mode` attribute; screenshots |
| AC6 | Lean task area: progress bar, Unsorted only when it holds tasks or during a drag, row extras on hover where hover exists | Manual run at 1280px and 375px |
| AC7 | Reports (Standup / Week) update live with one Copy action | Standup / recap tests unchanged |
| AC8 | Phone: mini player with Stop once the big timer scrolls away | Manual run at 375px |
| AC9 | No horizontal scroll at 375px, touch targets ≥ 44px; motion off with reduced motion | `scrollWidth === 375`, target scan, global reduced-motion rule |

## Laws of UX

| Law | Where |
|---|---|
| Fitts | 72px Start/Stop centred; per-row ▶ / ■; phone mini player in thumb reach |
| Hick | Row extras appear on hover; Unsorted hides when empty; one Reports card instead of two |
| Von Restorff | The only large filled control is Start/Stop; the running row is the only filled ■ |
| Aesthetic-Usability / Common region | One less layer of boxes; quadrants are the only tinted regions |
| Goal-gradient | Progress bar under Tasks |
| Doherty | Press squeeze and state layer answer every tap; reports rebuild instantly |
| Peak-End | Tick pop on done; Undo after reset, moves and deletes |
| Tesler | No "Build standup" step: reports are always ready |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A03 Injection | Task text rendered as text |
| A04 Design | Everything stays on the device; the selected task id is a per-device pref through `db.ts` |
