# Row gestures (P4)

**Goal:** acting on a task is one smooth thumb movement. **Law:** Fitts (the whole row is the target), Jakob (swipe-to-complete is what task apps teach), Doherty (the row answers while the finger moves).

## Behaviour

| Gesture | Result |
|---|---|
| Swipe right past the point (30% of the row, 72-160 px) or flick | Finish; on a done task, reopen |
| Swipe left past the point or flick | Open the task's actions |
| Short swipe | Spring back, nothing happens |
| Vertical move | Scrolls; never a swipe |
| Long-press 350 ms, then move | Drag between quadrants (unchanged) |
| Mouse | Drag only; no swipe |

A faint buzz marks the moment letting go will act. Reduced motion shortens the spring (global rule).

## Checked (375px, real touch events through CDP)

- Right swipe finishes; short swipe springs back with no transform left over; left swipe opens the menu; vertical swipe scrolls the page and acts on nothing; a tap still selects; long-press drag still moves a task and the swipe does not start under it.
- Mid-swipe frame shows the Done layer revealed behind the sliding row.

## Not verified here

A real iPhone / Android pass: edge swipes (iOS back gesture near the left edge), haptics, and scrolling momentum cannot be reproduced in emulation.
