# Guided New activity (phones)

**Story:** as a developer on my phone I want to set a task's details one question at a time, without a crowded row, so I am not overwhelmed. **Laws:** Hick (one choice at a time), Miller (four short steps), Goal-gradient (a progress bar that fills), Fitts (large targets, thumb-reach bar), Postel (accepts a pasted link with or without `https://`).

| # | Rule | Where |
|---|---|---|
| F1 | Four steps in order: title, link, size, quadrant. Only the title is required; the others have Skip | `FLOW_STEPS` |
| F2 | Next is disabled until the title has text | `flowStepError('title')` |
| F3 | A link is blank, `http(s)://…` or `www.…`; anything else is refused with a message. A recognised Jira or GitHub link shows a preview | `normalizeLink`, `sourceOf` |
| F4 | Title plus link must fit 500 characters; if not, say by how many and go back to the title | `composeText`, `flowResult` |
| F5 | A skipped size counts as 1; a skipped quadrant stays Unsorted | `flowResult` |
| F6 | `wip:` / `b:` / `done:` prefixes in the title set the status, as in the quick add | `parseDraft` |
| F7 | Back keeps every choice; close or Esc discards | `NewActivity.tsx` |
| F8 | Add uses the optimistic save; if the write fails the dialog stays open with every answer | `App.add` |

The button is phones only (`md:hidden`); the quick add stays.

## Checked (375 px, touch)

Next disabled until a title; a bad link blocked with a message and a Jira link previewed; Back keeps size and quadrant; a full add saves `Fix the seat map crash https://…SKYIQ-10143`, 5 SP, Do now, with the toast "Added to Schedule" where it landed; skip-everything adds a plain Unsorted task, and a `b:` title becomes Blocked; close and Esc discard; a too-long title plus link is caught on the screen; the quick add still works; no horizontal overflow; the button is hidden at 1280 px. Contrast measured on 19 element types in both modes (idle and running): all at 6.5:1 or better.

## Not verified here

A real phone: how the on-screen keyboard moves the bottom bar on iOS.

## Not here

Jira keys typed bare in the flow (the link step takes a URL); a draft that survives closing the dialog.
