# Feature: AI standup (Week 3)

Roadmap slice 3. Gate: golden set passes, no invented items, fallback tested.

## Decision

| Option | Verdict |
|---|---|
| AI only | ❌ breaks offline and when the key is missing |
| Rules only | ❌ no merging or rewording |
| **AI with grounded output + rules fallback** | ✅ same pattern as task-dashboard Smart assign |

Access control for now is a shared passcode (env `DEVLOG_PASSCODE`). Week 4 replaces it with Google sign-in + allow-list, as agreed in the spec.

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Offline, Build standup gives a rule-based standup labelled "Rules · offline" | Playwright |
| AC2 | AI unreachable or failing → rules + reason, never an error screen | Playwright ("Rules · AI unavailable") |
| AC3 | Server without key/passcode → 503; wrong passcode → 401; bad body → 400; > 4,000 chars → 413 | handler run against a fake API |
| AC4 | An AI item citing no note or an unknown note is dropped; a missing blocker is added back | `tests/standup.test.ts`, fake API run (`dropped: 1`) |
| AC5 | Copy puts a paste-ready standup on the clipboard | Playwright clipboard read |
| AC6 | Golden set: rules invent nothing and keep every blocker | `tests/standup.test.ts` |
| AC7 | Live AI passes the golden set | `npm run eval` after deploy (needs key) |

## Laws of UX

| Law | Where |
|---|---|
| Von Restorff | Build/Copy are outline buttons; Add stays the one filled accent |
| Hick | Settings hidden in a collapsed "AI settings" |
| Doherty | Rules answer instantly; AI has a 25 s ceiling with a pending label |
| Peak-End | "Standup copied" toast |
| Tesler | Previous workday found automatically (weekends skipped) |

## OWASP notes

| Risk | Mitigation |
|---|---|
| A01 Access | Passcode required, fail closed (503) when unset |
| A03 Injection | Zod-validated input, notes passed as data, grounded output, React text rendering |
| A04 Design | Rate limit, size caps, `effort: low`, 20 s timeout, 1 retry |
| A05 Misconfig | Generic client errors; details in server logs only |
| A09 Logging | Status codes and error names only, never notes or keys |
| A10 SSRF | Server calls only the Claude API through the SDK |
