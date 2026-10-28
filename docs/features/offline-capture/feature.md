# Feature: Offline capture (Week 2)

Roadmap slice 2 of the approved DevLog spec. Gate: a full day captured in airplane mode.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Offline, when I add a note, it is saved and still there after a reload | Playwright: 3 notes added offline, all present after reload |
| AC2 | A note starting with `b:` / `done:` / `wip:` gets that tag and loses the prefix | `tests/notes.test.ts` |
| AC3 | An empty note is refused with an inline message and focus stays in the input | Playwright: "Write something first." (`role="alert"`) |
| AC4 | Deleting a note can be undone for 5 seconds | Playwright: delete → Undo → note back |
| AC5 | Corrupt rows in storage are skipped, never crash | `isNote` test |
| AC6 | No horizontal scroll at 375px, touch targets ≥ 44px | `scrollWidth === 375`, `min-h-11` |

## Laws of UX

| Law | Where |
|---|---|
| Fitts | Composer sticky at the bottom, thumb reach, 44px targets |
| Hick | Three tags only; last used tag stays selected |
| Miller | Today grouped into Done / Doing / Blocker with counts |
| Postel | Spaces collapsed, tag prefixes accepted in any case |
| Doherty | Local save, no network round trip |
| Peak-End | Undo toast after delete |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A03 Injection | Note text rendered as text by Preact; no HTML injection path |
| A04 Design | No server storage; private mode storage failure shows an error, never loses typed text |
