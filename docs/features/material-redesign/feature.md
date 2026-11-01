# Feature: Material redesign

Restyle the one screen in Material Design 3 (dark scheme), built with Tailwind only. No `@mui/*` runtime: Emotion's runtime styles would need `style-src 'unsafe-inline'` in the CSP and roughly 100 KB more JS on an offline phone PWA, and the app is Preact.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Colours come from M3 colour roles in `@theme` (`src/styles.css`); no raw hex in components | `grep` for `#` in `src/components`, `src/App.tsx` |
| AC2 | Icons are inline SVG (`src/components/Icon.tsx`); no font or CDN host, CSP unchanged | `vercel.json` diff empty |
| AC3 | Pressable controls show a Material state layer (8% hover, 12% focus/press) | `state-layer` utility |
| AC4 | Status is never colour alone: online chip and tag groups carry icon + text | Screenshot at 375px |
| AC5 | No horizontal scroll at 375px, touch targets ≥ 44px | `scrollWidth === 375`, scan of buttons/inputs |
| AC6 | Behaviour unchanged: add, prefix tags, delete + undo, standup build and copy | `npm run verify`, manual run |

## Components

| Before | Material 3 |
|---|---|
| Status pill | Assist chip with cloud icon |
| Today card | Filled card, count badge, list items with trailing delete icon button |
| Standup buttons | Tonal button (Build) + outlined button (Copy) |
| Passcode input | Filled text field |
| Composer | Bottom sheet, filter chips with check mark, pill text field, filled Add button |
| Toast / undo | Snackbar on the inverse surface with a text action |

## Laws of UX

| Law | Where |
|---|---|
| Von Restorff | Add is the only filled primary button; Build is tonal, Copy outlined |
| Fitts | Composer stays a bottom sheet in thumb reach; chips keep a 44px touch target around a 32px visual |
| Aesthetic-Usability | One consistent Material system: shapes, state layers, colour roles |
| Jakob | Familiar Material patterns (filter chips, snackbar with Undo) |
