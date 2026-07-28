# AI_Headquarters — Project Context

Read this at the start of every session. This is the single source of truth for what this project is and how it is built.

---

## What This Is

**AI HQ** — a local-first browser dashboard where the user is the CEO and AI agents are employees. Users run their own AI startup from a visual 3D office.

- Visual: 3D office (React Three Fiber) — CEO corner, PA office, Board Room, open floor
- Runtime: Multi-agent system (Colyseus + Ollama) — agents think, talk, hire, execute tools
- Interface: Next.js 15 dashboard (OS-style shell) — agent status, tasks, costs, activity feed
- Default LLM: Ollama (local, free). BYOK for Claude, OpenAI, OpenRouter, Groq, Gemini.

**GitHub target:** 10,000 stars within 90 days of launch.

## Product Goal (North Star — set 2026-07-15)

AI HQ is a **sellable product**, not just an OSS repo. Customers set up and run a virtual AI office — AI employees they command as CEO — to build startups. The GitHub goal is a distribution channel for this.

- Every build decision moves toward a fully functioning, scalable prototype a stranger would pay for.
- Reliability of the core loop (CEO command → agents work → real output files) beats feature breadth.
- Known constraint: current architecture is single-tenant by construction (one office room, shared state). Hosted SaaS requires a room-per-user rewrite (v2). Near-term saleable shapes: self-hosted paid license, BYOK local/desktop product, or managed single instances.
- Standing mandate: stress-test the idea — market, competition, monetization, whether the 3D office differentiates or is a demo gimmick.

---

## Source Repos (Forked, MIT Licensed)

| Repo | What we took | What we changed |
|------|-------------|-----------------|
| [agent-office](https://github.com/harishkotra/agent-office) | Colyseus server, agent state machine, SQLite memory, tool execution, hiring engine | Removed Phaser.js UI, rewired for AIHQ API contract |
| [tenacitOS](https://github.com/carlosazaustre/tenacitOS) | Next.js shell, React Three Fiber 3D office, dashboard panels, auth | Removed all OpenClaw data sources, wired to AIHQ server |

Attribution required in README (MIT license).

---

## Architecture

```
apps/
├── dashboard/          ← Next.js 15 (tenacitOS fork) — browser UI
└── server/             ← Colyseus + Express (agent-office fork) — agent runtime

packages/
├── core/               ← Agent state machine, memory, tasks (from agent-office)
├── adapters/           ← Ollama, Claude, OpenAI, OpenRouter, Groq, Gemini adapters
└── types/              ← Shared TypeScript types (API contract)
```

**Data flow:**
```
User (CEO) → dashboard chat panel
  → POST /api/ceo/message
  → server (Colyseus) → Alex (PA agent)
  → PA routes to specialist agents
  → agents execute tools, write files
  → Colyseus events → dashboard WebSocket
  → 3D office updates, activity feed, task status
  → PA reports back to CEO
```

---

## API Contract (dashboard ↔ server)

### REST (server exposes, dashboard calls via Next.js API routes)
```
GET  /api/agents              all agents, status, role, desk position
POST /api/agents/hire         hire new specialist
POST /api/ceo/message         CEO sends command → goes to PA agent (SSE stream)
GET  /api/tasks               all tasks, assigned agent, status, output
GET  /api/costs               usage/cost data from SQLite
GET  /api/output              read an output file (path-guarded)
GET  /api/system              served by the dashboard locally (CPU, RAM, disk)
```

### WebSocket (Colyseus → dashboard real-time)
```
agent:status      idle / thinking / working / talking / in-meeting
agent:message     agent said something → chat log
agent:action      tool call executed → activity feed
agent:hired       new agent spawned → new desk in 3D office
board:started     board meeting triggered → agents move to Board Room
board:ended       board meeting done
task:created      new task assigned
task:completed    task done, output file path returned
task:failed       task errored → status + toast
```
Agent positions sync via the Colyseus state schema (OfficeState/AgentState), not a discrete `agent:move` event.

---

## 3D Office Layout

```
┌─────────────────────────────────────────┐
│  CEO CORNER (you)   PA OFFICE (Alex)    │
│  [No agent here]    [PA desk]           │
│                                         │
│         BOARD ROOM                      │
│    [Round table — 4-6 seats]            │
│                                         │
│  OPEN FLOOR (employee desks)            │
│  [Dev]  [Ray]  [Cleo]  [Max]            │
│  [+hire slot]  [+hire slot]  ...        │
└─────────────────────────────────────────┘
```

Agent zones have semantic meaning:
- Agent at their desk = active work
- Agent in Board Room = multi-agent discussion (triggered by PA)
- PA walking to CEO corner = delivering a report
- Agent on sofa = idle

---

## Pre-Built Agents (Ships at Launch)

| ID | Name | Role | Tools |
|----|------|------|-------|
| `pa` | Alex | PA / Orchestrator. Routes CEO commands, delegates, reports back. Always first in the loop. | All internal APIs |
| `dev` | Dev | Developer. Code writing, debugging, file ops. | code-exec, file-write, file-read, web-search |
| `researcher` | Ray | Researcher. Web research, synthesis, fact-checking. | web-search, file-write |
| `copywriter` | Cleo | Copywriter. Content, emails, landing page copy. | file-write, web-search |
| `analyst` | Max | Market Analyst. Market intel, competitor research. | web-search, file-write |

**Hiring:** CEO says "hire a financial analyst" → PA creates config → new desk spawns in 3D office.

---

## The Launch Demo Workflow (Must Work Perfectly)

**CEO types:** "Build me a landing page for a B2B SaaS that helps restaurants manage food waste"

**Flow:**
1. PA receives → clarifies if needed → creates task plan
2. PA assigns: Ray (market research) + Cleo (copy) + Dev (build HTML)
3. Board Room: PA + Dev + Cleo align on final output
4. Output: `output/landing-page/index.html` + `output/copy.md`
5. PA reports to CEO with summary + file paths

**Target:** Under 5 minutes end-to-end with Claude API. This is the demo video.

---

## LLM Configuration

**Default:** Ollama (local). Zero API cost. User needs Ollama installed.

**BYOK options (user provides key in dashboard settings):**
- Claude (Anthropic)
- OpenAI (GPT-4o, GPT-4o-mini)
- OpenRouter (access to all models)
- Groq (fast inference)
- Gemini (Google)

All adapters live in `packages/adapters/`. Provider selection is global (per-session): the first configured BYOK key in dashboard Settings is used for all agents; hired agents inherit the session provider. Per-agent overrides are not implemented.

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file. Project context. Read at session start. |
| `docs/internal/TASK_QUEUE.md` | Atomic task list. Single source of truth for what to build next. |
| `CHANGELOG.md` | File-level change log. Every agent logs here after each task. |
| `docs/internal/AGENTS.md` | Full multi-brain protocol. Roles, rules, conventions. |

All planning/strategy docs live in `docs/internal/` (gitignored — never ships public). Contributor-facing docs: root README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT + `docs/*.md`.

---

## What Has Been Cut (Do Not Re-add Without Claude Approval)

- Phaser.js pixel art (replaced by React Three Fiber)
- Viral mode / audience voting / chaos triggers (entertainment features)
- Relationship graph (not utility-relevant for v1)
- Terminal (security risk, v2)
- Memory browser (v2)
- File browser (v2)
- Global search (v2)
- Voice mode (v2)
- GitHub PR integration (v2)
- Multiple office floors (v2)

---

## User

Jinu Joshi. Non-coder. CEO of this product vision. Gives direction, confirms decisions, does not write code. Communication: terse, no filler.

---

## Attribution

Agent-office by harishkotra — MIT License
TenacitOS by carlosazaustre — MIT License
Both must appear in README attribution section.
