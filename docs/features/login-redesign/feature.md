# Feature: Animated sign-in page

Owner request (2026-11-03): "redesign login page with fancy UI, use animated such as gif corporate animation".

Decision: the animation is CSS (keyframes on transform / opacity) and SVG, not a GIF: crisp at any size, a few KB instead of megabytes for an offline PWA, no new host in the CSP, and it can stop for people who prefer reduced motion.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| L1 | The page tells the product story in a loop: cards sorted into quadrants, stopwatch fills, points scored, bars grow, synced | Manual run: frames captured over a loop |
| L2 | One clear action: "Continue with Google" with the official multi-colour G (brand colours as tokens) | Manual run |
| L3 | On a 375 × 812 phone the button is visible without scrolling | `getBoundingClientRect().bottom` 606 < 812 |
| L4 | No horizontal scroll at 375px, targets ≥ 44px | Target scan, `scrollWidth === 375` |
| L5 | Reduced motion: every animation ends on its settled 100% frame (the finished scene) | Keyframes in `styles.css` |
| L6 | Error states (denied / offline / session ended) still show above the button | Unchanged messages |

## Laws of UX

| Law | Where |
|---|---|
| Aesthetic-Usability | A polished first impression |
| Von Restorff | One bright, high-contrast button on a dark page |
| Fitts | Button in view and in thumb reach on phones |
| Miller | Four feature tiles, one short paragraph |
