# Declutter and organise (P5)

**Goal:** each screen shows the next useful thing, not everything. **Laws:** Hick (fewer choices at once), Miller (chunks, not a wall), Fitts (actions in thumb reach), Goal-gradient (progress is visible and moves), Zeigarnik (open work stays in view).

| Before | After |
|---|---|
| Row menu expanded inside the row and pushed the list under the finger | One bottom sheet, same place every time; Esc / tap outside / Close |
| Every link a chip, wrapping one per line on a phone (rows ~160 px tall) | First link + `+n`; tap to show all |
| "Unsorted" printed on every List row | Place shown only when sorted |
| Empty quadrant 160 px of box on a phone | Slim drop strip; quadrants collapse from the header and remember it |
| Add field with size select and two buttons always showing | Field only until focus or text; wide screens unchanged |
| Progress only as done / total | Plus `8/10 SP today` toward the target, popping when it moves |

## Accessibility

Every gesture has a button (tick, ⋯). The sheet is a native `<dialog>` (focus trap, Esc). Quadrant headers are real buttons with `aria-expanded`; the composer's extra controls leave the layout (not just the view) when collapsed.

## Checked (375px, real touch + mouse)

Sheet opens from ⋯ and from a left swipe; a move closes it, a story-point change keeps it open and updates; Esc closes; collapse persists across reload; `+n` expands; composer expands on focus and collapses on blur when empty; SP readout updates (`8/10 SP today`); drag (mouse and touch long-press), swipes and perf unchanged.

## Not here

Swipe-down to dismiss the sheet; a 2x2 overview of the matrix on a phone (larger change, proposed separately); developer metrics (P6).
