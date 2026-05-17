# AGENTS.md — Multi-Brain Protocol

Full protocol for how Claude Code, Kilo Code, and Cline coordinate on AI_Headquarters.

---

## Roles

| Brain | Role | Does | Never Does |
|-------|------|------|-----------|
| **Claude Code** | Principal Architect | Reads codebase, specs tasks, makes architecture decisions, reviews drift, unblocks Kilo/Cline | Raw implementation, touching source files directly |
| **Kilo Code** | Primary Implementer | Reads TASK_QUEUE.md, executes Brain=Kilo Code tasks, logs to CHANGELOG.md | Architecture decisions, touching Brain=Cline tasks |
| **Cline** | Secondary Implementer | Same as Kilo Code for Brain=Cline tasks. Steps in when Kilo is rate-limited or task is complex | Architecture decisions, touching Brain=Kilo Code tasks |

**Jinu** gives direction, confirms model switches, reads output. Does not write code.

---

## The Loop

```
1. Claude specs tasks in TASK_QUEUE.md
      ↓
2. Kilo Code: reads TASK_QUEUE.md → picks first READY task with Brain=Kilo Code
   → marks IN-PROGRESS before touching anything
   → executes
   → logs to CHANGELOG.md
   → marks DONE

3. Cline: same, for Brain=Cline rows

4. Both can run simultaneously — no conflicts because each only claims its own rows

5. After 5–7 tasks: Jinu tells Claude "review the project"
   → Claude reads CHANGELOG.md + recent changes
   → fixes drift
   → adds/updates tasks in TASK_QUEUE.md
```

---

## TASK_QUEUE.md Format

### INDEX table (top of file)

| ID | Title | Brain | Status | Phase | Depends On |
|----|-------|-------|--------|-------|------------|
| T-001 | Example task | Kilo Code | READY | 0 | — |

**Status values:** `READY` | `IN-PROGRESS` | `DONE` | `BLOCKED` | `CANCELLED`

### DETAIL SPEC (one block per task)

```
### T-001 — [Title]
**Brain:** Kilo Code
**Status:** READY
**Phase:** 0
**Depends On:** —

**Goal:** One sentence. What does done look like?

**Steps:**
1. Step one
2. Step two
3. Step three

**Output:** What files are created/modified?

**Escalate to Claude if:** What would make this task require architecture decisions?
```

---

## CHANGELOG.md Format

Every brain logs after every task. No exceptions.

```
## T-001 — [Title] [DONE] [Brain: Kilo Code] [2026-05-17]

Files changed:
- CREATED: apps/server/src/rooms/OfficeRoom.ts
- MODIFIED: packages/core/src/agent.ts (added hire() method)
- DELETED: apps/dashboard/src/api/openclaw.ts

Notes: [anything non-obvious about what was done or not done]
```

---

## Conventions

- **File prefix:** AI-generated files outside wiki get prefix `(CAI)`. Inside vault wiki: use `ai_generated: true` frontmatter.
- **Mark IN-PROGRESS first.** Before touching any file, mark the task IN-PROGRESS in TASK_QUEUE.md. Prevents double-claiming.
- **No architecture decisions by Kilo or Cline.** If a task requires one, stop. Add a comment in TASK_QUEUE.md: `BLOCKED — escalate to Claude: [reason]`. Tell Jinu.
- **One task at a time per brain.** Do not start the next task until current is DONE and logged.
- **Never modify AGENTS.md or CLAUDE.md.** Only Claude updates these files.

---

## Escalation Rules

Kilo Code or Cline must escalate to Claude (via Jinu) when:
- Task requires choosing between two technical approaches
- A dependency is missing or broken
- A task would require modifying the API contract in `packages/types/`
- A task touches more than 5 files across 2+ packages
- Anything in `packages/adapters/` needs a new adapter added

---

## Model Routing

| Task Type | Preferred Brain |
|-----------|----------------|
| Architecture, API design, review | Claude Code |
| Standard implementation, wiring, config | Kilo Code |
| Complex multi-file refactors | Cline |
| Simple file creation, copy-paste adaptation | Kilo Code |
| Debugging Kilo Code's output | Cline |

---

## Phase Map

| Phase | Name | Goal | Exit Criteria |
|-------|------|------|---------------|
| 0 | Foundation | Monorepo boots, both apps running | `docker compose up` works |
| 1 | Strip & Wire Backend | Dashboard talks to server via API | Agent list populates from Colyseus |
| 2 | 3D Office Redesign | CEO/PA/Board Room/Open Floor layout live | Agent positions reflect Colyseus state |
| 3 | CEO Interface + PA | CEO types command, PA routes it | Something actually happens end-to-end |
| 4 | Specialists + Tools | All 5 agents work, produce file output | Each agent completes a task with output |
| 5 | End-to-End Workflow | Landing page demo works under 5 min | Demo video can be recorded |
| 6 | Launch Prep | README, Docker one-liner, demo GIF | Stranger can set up in under 5 min |
