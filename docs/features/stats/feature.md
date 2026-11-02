# Feature: Stats and daily targets

Owner request (2026-11-02), with a reference screenshot: "statistics of daily activity like total time taken, streak, points, reporting to analyse each task breakdown into insightful meaning, can switch, settings with a target of tasks to complete and total story points to achieve daily".

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Each stopwatch run is stored with start and end; time is dated by the run's start in the user's zone | `stopTimer` and `dayStats` tests (incl. UTC+8 day boundary) |
| AC2 | Today shows story points, tasks done and focus time against the daily targets; a reached ring shows ✓ | Manual run |
| AC3 | Streaks: days in a row with activity, days in a row on the SP target; today not counted against you before it ends | `streak` / `longestStreak` tests |
| AC4 | Last 7 days chart switches between Time, Points and Tasks, shows the target line and marks days on target | Manual run (Points: Mon 8, Sun 5 …) |
| AC5 | Weekly review compares with the 7 days before: total, sessions, best day, points, tasks, top task, longest streak | `weeklyReview` test |
| AC6 | Breakdown by quadrant and by task (share, minutes per story point) over the last 7 days | `breakdown` test |
| AC7 | Up to five insights in plain language, only when there is enough data | `insights` tests |
| AC8 | ⚙ opens daily targets (tasks 1–20, SP 1–60, focus 15–600 min in 15-min steps); Save updates the stats at once; values stay on the device | `isTargets` test; manual run (12 SP → ring "8 of 12 SP") |
| AC9 | Screen switch: Timer / Tasks / Stats on phones, Focus / Stats on wide screens | Manual run |
| AC10 | No horizontal scroll at 375px, targets ≥ 44px | `scrollWidth === 375` (fixed a 1px overflow), target scan |

## Laws of UX

| Law | Where |
|---|---|
| Goal-gradient | Rings fill toward each daily target and turn into ✓ |
| Zeigarnik | Streak chips keep an unbroken chain in view |
| Hick | One metric at a time in the chart; at most five insights |
| Miller | Seven days, three goals, six review tiles |
| Jakob | Familiar tab bar for screens; native modal dialog for settings |
| Peak-End | "Finished today" lists what was scored, with +SP |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A03 Injection | Task text rendered as text in insights and lists |
| A04 Design | Targets validated with `isTargets` on read; stats computed on the device, nothing sent |
