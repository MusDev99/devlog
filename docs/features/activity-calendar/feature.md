# Feature: Activity calendar and CSV report

Owner requests (2026-11-03): "add monthly calendar insight like this: I can click a date and see what task I had done / I can generate my report in CSV", and "make the size bigger like the first pic, don't leave any margin but responsive to web/mobile view".

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| C1 | Stats shows 12 Monday-first weeks, shaded by focus time, month labels, future days blank | `tests/calendar.test.ts`; manual 1440px / 375px |
| C2 | Tapping a day lists the tasks timed (time that day) or finished that day, with quadrant and SP | `dayTasks` test; manual run |
| C3 | Arrow keys move the picked day; prev / next buttons (44px) do the same | Manual run |
| R1 | "CSV report" downloads the 12 weeks; "CSV for this day" the picked day; UTF-8 BOM for Excel | `reportCsv` test; manual run |
| R2 | Cells starting with = + - @ are prefixed with `'`; commas, quotes and line breaks are quoted | `csvCell` test |
| L1 | Large screens use the full window width; 375px has no horizontal scroll | Manual: scrollWidth 375 |

## Laws of UX

| Law | Where |
|---|---|
| Zeigarnik / Goal-gradient | Active days fill in; gaps are visible |
| Fitts | Small cells have a 44px prev / next alternative |
| Tesler | One tap to a CSV; no export settings |

## OWASP notes

| Risk | Mitigation |
|---|---|
| CSV / formula injection | `csvCell` prefixes `'` on = + - @ tab CR |
| Data exposure | The CSV is built in the browser from local data; nothing is sent |
