# Feature: Kanban board

Owner decisions (2026-11-01): one persistent board; columns To do · Doing · Blocked · Done; keep the standup and Friday recap, built on the phone with no AI.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | The board shows To do, Doing, Blocked, Done; cards stay until moved or deleted | `boardColumns` test; reload keeps cards |
| AC2 | On a phone one column shows at a time behind tabs with counts; at ≥ 768px all four show | Manual run at 375px and 1280px |
| AC3 | A card moves with one tap to its next column (To do → Doing → Done, Blocked → Doing) or to any column from its menu | `NEXT_TAG` test; manual run |
| AC4 | On wide screens cards drag between columns | Manual run (drag events) |
| AC5 | Moves and deletes can be undone for 5 seconds | Manual run: Undo restores the previous column |
| AC6 | New cards go to the selected column; `todo:` / `wip:` / `b:` / `done:` prefixes override it and the view follows | `parseDraft` test; manual run |
| AC7 | Done cards older than 7 days fold into Earlier | `boardColumns` test |
| AC8 | Standup: Yesterday = cards done/doing on the last earlier active day; Today = done today + Doing; Blockers = Blocked | `ruleStandup` tests, golden set |
| AC9 | Cards from the old day list keep working (done / doing / blocker tags) | `isNote` accepts old rows; store unchanged |
| AC10 | No horizontal scroll at 375px, touch targets ≥ 44px | `scrollWidth === 375`, target scan |

## Laws of UX

| Law | Where |
|---|---|
| Hick | Phone shows one column; the composer has no column picker, it adds to the selected column |
| Fitts | One-tap → button on each card; composer at the thumb; 44px targets |
| Miller | Four columns; Done older than a week folds into Earlier |
| Jakob | Familiar kanban columns, drag and drop on desktop, snackbar with Undo |
| Peak-End | Undo after every move or delete; adding with a prefix jumps to that column so the card never vanishes |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A03 Injection | Card text rendered as text by Preact; drag data is only a card id looked up on the board |
| A04 Design | Everything stays in IndexedDB on the device; no network calls |
