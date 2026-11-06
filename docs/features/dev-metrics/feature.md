# Developer metrics (P6)

**Goal:** answer the questions a developer asks of their week: which ticket or repo ate the time, do my estimates mean anything, am I juggling too much. **Laws:** Zeigarnik (open work), Goal-gradient, Hick (three cards, no settings).

| Question | Where | Rule |
|---|---|---|
| Where did time go by ticket / repo? | Stats, "Time by ticket or repo" | Tracked time of the last 7 days, grouped by the task's first link: Jira key per ticket, GitHub `owner/repo` per repo (PRs and issues add up), else the site. Unlinked time is one line. |
| Do story points track effort? | Stats, "Sizing check" | Finished tasks of the last 4 weeks with 5+ min tracked; average per size; "drifts" when a bigger size averaged under 90% of the next smaller one; silent under 3 sizes. |
| Too much in flight? | Insights | 3+ tasks in Doing: warn, shown first. |
| Planned vs reactive? | Already in "Where your time went" (quadrant split) and the Do now / Schedule insights | Not repeated. |

## Checked

Seeded 9 tasks (Jira, GitHub, unlinked, mixed sizes, running): fare-engine = 3h 35m over two PRs/issues, tickets sorted by time, 32m unlinked, the 8 SP-under-5 SP drift is called out, WIP warning shows; no horizontal scroll at 375 px. Rules covered by `tests/work.test.ts`.

## Not here

Jira key auto-link (typing `SKYIQ-123` links to your Jira): needs a Jira base URL per profile (a Settings field and a new Users-sheet column). Proposed separately, only if wanted.
