# Feature: Mobile-first PWA

Owner request (2026-11-02): "make this application mobile first, PWA".

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | On a phone, screens switch from a bottom tab bar in thumb reach; it respects the home-indicator safe area | Manual run at 375px |
| AC2 | The app launches fully offline after one visit (server stopped → reload → app works) | Manual run on `vite preview`; `ignoreVary` test |
| AC3 | Install: an Install button where the browser offers it; iPhone / iPad get a dismissible Add to Home Screen hint | `useInstall`; `isIos` test |
| AC4 | A new version waits; "New version ready · Reload" swaps it in and reloads once | Manual run: waiting → banner → Reload → active, no banner; SW test |
| AC5 | Manifest: `id`, standalone, colours equal `--color-bg`, maskable icon, shortcuts Timer / Add a task / Stats that open the right screen | `tests/pwa.test.ts`; manual run of `?screen=tasks&new=1` |
| AC6 | Installed extras: open-task badge on the icon, persistent storage requested once tasks exist, haptic tick on Start / Stop, no overscroll bounce | Code; supported browsers only, silent elsewhere |
| AC7 | No horizontal scroll at 375px, targets ≥ 44px | `scrollWidth === 375`, target scan |

## Laws of UX

| Law | Where |
|---|---|
| Fitts | Bottom tab bar and mini player in thumb reach |
| Jakob | Native-style tab bar with a selected-pill indicator; standard install and update prompts |
| Doherty | Offline-first launch from cache; haptic tick answers Start / Stop at once |
| Peak-End | Updates never interrupt; the person chooses when to reload |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A05 Misconfiguration | CSP unchanged; no new host; SW still caches same-origin GET only |
| A08 Integrity | Hashed assets only are ignore-Vary matched; updates apply only on the person's go-ahead |
