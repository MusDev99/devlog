# Feature: Eisenhower dashboard

Owner request (2026-11-02): a task dashboard on the urgent × important quadrants, draggable, a T-shirt size (1, 3, 5) and a start/stop timer per task. Decisions: the matrix replaces the kanban board and each task keeps a status; one timer at a time.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Tasks sit in Do first (urgent, important), Schedule (important), Delegate (urgent), Eliminate | `matrix` test; 2×2 grid at 1280px with axis labels |
| AC2 | A task drags by its handle onto another quadrant or Done, with mouse or touch; on a phone onto the 2×2 selector | Manual run: pointer drag at 375px and 1280px |
| AC3 | Every drag has a menu equivalent (quadrant, status, delete) | `TaskCard` menu; manual run |
| AC4 | Each task has a size S 1 / M 3 / L 5; one tap cycles it; quadrants and totals show points | `nextSize`, `matrix` points tests; manual run |
| AC5 | Start/stop timer per task; starting one stops the other and marks the task Doing; leaving Doing stops it | `startTimer` / `moveNote` tests; manual run |
| AC6 | A running timer survives a reload and keeps counting | Manual run: reload, still running |
| AC7 | Old tasks keep working: no quadrant → Schedule, no size → S | `quadrantOf` / `sizeOf`, `isNote` tests |
| AC8 | Standup and recap still come from status | Standup and recap tests unchanged and passing |
| AC9 | No horizontal scroll at 375px, touch targets ≥ 44px | `scrollWidth === 375`, target scan |

## Laws of UX

| Law | Where |
|---|---|
| Hick | Phone lists one quadrant; size has three steps; composer has no pickers |
| Fitts | Drag handle, size and timer are 44px targets; Stop sits in the top bar |
| Miller | Four quadrants; old Done folds into Earlier |
| Jakob | Standard Eisenhower layout (urgent left, important top) |
| Peak-End | Undo after every move, status change or delete; a dropped task's quadrant opens |
| Doherty | Timer and moves are local; the clock ticks once a second only while a timer runs |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A03 Injection | Task text rendered as text; drag carries only the task in memory, no `dataTransfer` strings |
| A04 Design | Everything stays in IndexedDB; the drag ghost position is set through the CSSOM, allowed by `style-src 'self'` |
