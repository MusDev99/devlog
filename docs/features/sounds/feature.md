# Feature: sounds on finish and on start / pause

Owner requests (2026-11-04): "add sound after completing activity" (`yay.mp3`) and "add this sound when start/pause activity" (`seatbelt.wav`).

## Roadmap

| Phase | Task | Status |
|---|---|---|
| 1 | `src/lib/sound.ts`: Web Audio player (decode once, injected audio, never throws) + tests | ✅ |
| 2 | `src/lib/sounds.ts`: cheer (finish) and chime (start / resume / pause); wired next to the haptics | ✅ |
| 3 | Offline: `.mp3` joins the service worker precache list | ✅ |
| 4 | Settings → Sounds switch, per device | ✅ |

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Start (timer, row, Space, composer ▶), resume and pause play the chime once | Playwright: buffer 1.15 s on each |
| AC2 | Finish (button, row check, drop on Done) plays the cheer, not the chime | Playwright: buffer 1.88 s |
| AC3 | A status change that stops a running clock plays the chime | same handler as the haptic `stop` |
| AC4 | Sounds off: nothing is fetched or played; the choice survives a reload; turning on plays the chime once | unit + 375px run |
| AC5 | No Web Audio, a failed fetch or an undecodable file: silent, no error, and the next play retries | `tests/sound.test.ts` |
| AC6 | Both files are in the precache list and the SW cache | `tests/sw-assets.test.ts`; `caches` check on `vite preview` |

## Laws of UX
Doherty Threshold (decoded ahead, played from memory: the sound answers the tap at once) · Von Restorff (Finish has its own cheer, so completion stands out from the routine chime) · Peak-End (a good last note on each finished task) · Jakob (a chime on a stopwatch is what people expect).

## OWASP / privacy
Client-only. Same-origin files (`default-src 'self'` already covers them, no CSP change); the only stored value is `devlog.sound` on / off.

## Notes
- Web Audio instead of `<audio>`: plays from memory, and Safari refuses media a service worker answers without Range support.
- The browser only unlocks audio inside a tap, so `play` is called straight from the handler, before any `await`.
- On iPhone the ringer switch silences Web Audio; that is the person's choice and is respected.
- Not covered: "Added as done" from the composer (no clock stops, so no sound).
