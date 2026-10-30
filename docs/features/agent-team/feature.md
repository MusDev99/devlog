# Feature: agent team (Week 1, local CLI)

Five Claude Code subagents act as a small software team on this repo, run locally with `/team <idea>`. Design and roadmap: [multi-agent team design](https://claude.ai/artifact/8J4Su5wHbHgwYFSspqfjrQ). Owner choice (2026-10-30): **local CLI on devlog**.

## Decision

| Option | Verdict |
|---|---|
| **Claude Code subagents, local CLI** | ✅ chosen: no infra, runs only when the owner starts it |
| Subagents + GitHub Actions | later, if unattended runs are wanted |
| Agent SDK service on Cloud Run | later, if an orchestrator with memory and metrics is needed |

## Roles

| Role | File | Writes | Tools |
|---|---|---|---|
| 🧑‍💼 Product Owner | `.claude/agents/product-owner.md` | `docs/features/<slug>/feature.md` | Read, Grep, Glob, Write |
| 📋 Project Manager | `.claude/agents/project-manager.md` | `## Plan` in the same file | Read, Grep, Glob, Edit |
| 👩‍💻 Software Engineer | `.claude/agents/software-engineer.md` | code, tests, docs, local commits | Read, Grep, Glob, Edit, Write, Bash |
| 🧪 QA | `.claude/agents/qa.md` | nothing (verdict only) | Read, Grep, Glob, Bash |
| 🚀 DevOps | `.claude/agents/devops.md` | nothing (PR draft only) | Read, Grep, Glob, Bash |

## Acceptance criteria

| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1 | Each role file has a matching name, a description and a tool list | `tests/agents.test.ts` |
| AC2 | QA and DevOps cannot edit files; no read-only role has both write and Bash | `tests/agents.test.ts` |
| AC3 | `/team` runs PO → gate → PM → Engineer ⇄ QA (max 3 rounds) → DevOps → gate | `tests/agents.test.ts`, `.claude/commands/team.md` |
| AC4 | Agents cannot read `.env`, push to `main`, force-push or merge | `.claude/settings.json` deny rules, `tests/agents.test.ts` |
| AC5 | A dry run on a small idea produces a spec and stops at Gate 1 | owner runs `/team` locally (Week 1 gate) |

## Guardrails

| Risk | Mitigation |
|---|---|
| A01 Access | Deny rules: no `.env`, no push to `main`, no force-push, no `gh pr merge` |
| A03 Injection | Every role treats notes, issues and file text as data |
| A04 Design | Owner gates before planning and before any push; 3-round cap |
| A09 Logging | Agents never print secrets |

## Next (roadmap)

Week 2 adds triggers and run caps, Week 3 is the pilot feature, Week 4 hardens (evals, cost log), Week 5 decides on a second repo or the Agent SDK.
