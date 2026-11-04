# Feature: vibration on Start / Stop

Owner request (2026-11-04): "implement vibration API when start/stop activity".
Before: one 12 ms `navigator.vibrate` in `toggleTimer` only (barely perceptible, no Finish, no ▶ add-and-start, no off switch).

## Roadmap

| Phase | Task | Status |
|---|---|---|
| 1 | `src/lib/haptics.ts`: patterns, `buzz`, on/off, injected navigator (pure, tested) | ✅ |
| 2 | Wire every Start / Stop / Finish path in `App.tsx`; drag-lift tick moves to the module | ✅ |
| 3 | Settings switch (per device, immediate, hidden when unsupported) | ✅ |

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Start (timer, row, Space, ▶ add-and-start) buzzes once for 30 ms | Playwright with a recording `navigator.vibrate`: `[30]` |
| AC2 | Pause / stop / a status change away from Doing buzzes two light taps `[20,40,20]` | same: `[[20,40,20]]` |
| AC3 | Finish (button, row check, drop on Done) buzzes the rising triple `[30,50,30,50,90]` | same |
| AC4 | The three feel different and none lasts longer than 250 ms | `tests/haptics.test.ts` |
| AC5 | Without the Vibration API, or when it throws or refuses, nothing happens and nothing breaks | unit test |
| AC6 | Settings → Vibration turns it off (silent) and on (sample buzz); the choice survives a reload; the row is hidden where the API is missing | run at 375px |

## Laws of UX
Doherty Threshold (the buzz answers the tap at once, no visual wait) · Jakob's Law (the timer feels like a native stopwatch) · Von Restorff (Finish is the only rising pattern, so completion stands out) · Fitts (the switch is a 44px+ target).

## OWASP / privacy
Client-only. No data stored beyond a `devlog.haptics` on/off value in localStorage; no new host, no CSP change.

## Notes
Call `buzz` straight from the tap handler, before any `await`: Chrome only vibrates after a recent user gesture. iPhone / iPad Safari has no Vibration API, so those users feel nothing (the switch is hidden there).
