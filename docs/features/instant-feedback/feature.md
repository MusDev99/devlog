# Instant feedback and skeletons (P2 + P3)

**Goal:** every tap answers in the same frame, and loading never shows a wrong or jumping screen. **Why:** each tap waited for the IndexedDB write (about 200 ms on a slow phone) before anything changed, and loading showed one grey block, then an empty "Pick a task" / empty standup, then content.

## Behaviour

- Add, Start / Pause, Done / reopen, move, size, delete and Undo update the screen first; the write follows.
- A failed write: the affected tasks go back as they were (a task edited again since stays as it is), the Undo for it goes away, toast "Could not save on this device". A failed add puts the typed text back in the field.
- Composer clears at once; no disabled state while saving.
- Skeletons for Tasks, Stats, the Standup card and the timer's task pill / status. Invisible for the first 150 ms; shimmer by transform only; reduced motion stops it.

## Measured (375px, every device write delayed 200 ms)

| Action | Before (P1) | After |
|---|---|---|
| Add to visible row | 205 ms | 4 ms |
| Start timer to Pause button | 224 ms | 10 ms |
| Mark done to row in Done | 212 ms | 19 ms |

On a fast device (headless Chromium, no delay) both are 20-45 ms: the gain grows with storage latency.

## Acceptance

- `npm run verify` green (rollback rules in `tests/optimistic.test.ts`).
- Forced write failure: row reverts, toast shows, composer text returns (checked with a patched `IDBObjectStore.put`).
- A fast load never shows a skeleton; a 900 ms load shows it after 150 ms and removes it on arrival.

## Not here

Swipe gestures (P4), declutter (P5), developer metrics (P6). A dedicated "progress illusion" pass (e.g. the daily-target ring filling as a task is finished) has no phase yet; proposed for P5.
