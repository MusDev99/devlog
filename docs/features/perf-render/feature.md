# Perf: render and drag (P0 + P1)

**Goal:** the app feels instant on a mid-range phone. **Why:** a one-second tick re-rendered every row, Reports and Stats; a drag re-rendered the whole task tree on every pointer move (~20 fps at 4x throttle).

## Measured (375px, 100 tasks, one running timer, 4x CPU throttle, `scripts/perf.cjs`)

| Metric | Before | After P1 |
|---|---|---|
| Main-thread work per 5 s idle tick | 390 ms | ~135 ms |
| DOM mutations per 5 s | 66 | 31 |
| Drag, cost per pointer move | 48 ms | 14 ms |
| Drag, 60 moves wall time | 3441 ms | ~1400 ms |
| Tap to first visual change | 35-81 ms | 20-45 ms (P2 removes the IndexedDB wait) |
| Main JS | 114.8 kB | 122.5 kB (`preact/compat` memo) |

## Acceptance

- A tick re-renders only subscribers of the clock (running row, stopwatch, mini player, title, Stats while running).
- Drag works with mouse and touch long-press (ghost, drop ring, move toast, undo); a swipe still scrolls.
- Phone tab switches mount only the open screen's Tasks / Reports; wide screens show both.
- `npm run verify` green; no console errors.

## Not in this phase

Optimistic saves (P2), skeletons (P3), swipe gestures (P4), declutter (P5), developer metrics (P6). Touch drag needs a manual pass on a real iPhone and Android (emulation only here).
