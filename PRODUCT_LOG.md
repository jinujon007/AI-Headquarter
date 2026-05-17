# PRODUCT_LOG.md — AI_Headquarters (AI HQ)

**Purpose:** Captures every idea, decision, recommendation, and rejection made during product development. Read this before any brainstorming or planning session. Never debate a closed decision again.

**How to use:** When starting a product discussion, tell Claude: "Read PRODUCT_LOG.md first." Claude reads it, picks up exactly where we left off.

**Maintained by:** Claude Code. Updated after every product planning session.

---

## SESSION 1 — 2026-05-17/18
### "The Origin Session — From Raw Idea to Build-Ready Project"

---

### 1.1 The Raw Idea (Jinu's original vision)

Jinu described a product he wants to build:

- An **agentic OS** styled as a real office with a visual interface
- Office layout: **CEO's office**, **Personal Assistant's office** (adjacent to CEO), **Board Meeting Room**
- **Chat interface** as the primary interaction model (like all AI chat products)
- Ability to **hire new employees as agents** with specific skill sets
- Goal: Enable people to **run their own AI startup company** with AI employees solving real-world problems
- Target: **10,000 GitHub stars** within a compressed timeline
- Priority: Speed. Time is the competitive advantage. People are building fast.

**Core metaphor:** You are the CEO. AI agents are your employees. The office is your startup.

---

### 1.2 Research Report Synthesis (Google Gemini Deep Research)

Key findings from the research report Jinu provided:

**The competitive landscape:**
- MetaGPT — software company simulation, terminal-only, 40k+ stars
- ChatDev — software factory, no visual UI, 10k+ stars
- CrewAI — multi-agent framework, developer-facing, no visual layer
- AgentGPT — web UI, no office metaphor

**The gap:** Nobody has shipped a visual office metaphor with actual utility. This is the opening.

**Technical architecture proposed:**
- Decoupled visual state engine via JSONL transcript tailing
- Agent execution runtime as background daemon
- Spatial layout: CEO office / PA office / Board room
- Dynamic hiring engine (prompt → JSON config → tool binding → desk spawn)
- Sandbox-as-a-tool pattern for code execution

**Growth mechanics from the report:**
- 3-second README rule (animated GIF of office in action at top)
- Tuesday 9am ET launch
- HN Show HN post (non-promotional, technical)
- Awesome-list PRs for organic evergreen traffic
- Seed network for first 100-300 stars before public launch

**Claude's assessment of the report:**
- QEMU microVMs for v1 = over-engineering. Cut. Docker sandbox is sufficient.
- Isometric 3D aesthetic is risky given LLM latency (20-40s per action). 2D or clean 3D > full isometric RPG.
- Framework choice left open in report — Claude resolved: **LangGraph**... then revised to **Colyseus** (after finding agent-office).
- Viral mode vs utility mode tension — report names it but doesn't resolve it.
- Missing: viral content layer (stars come from content, not the repo), default employees, stack decision.

---

### 1.3 Agent-Office Repo Analysis

**Repo:** https://github.com/harishkotra/agent-office
**Stars:** 86 | **Forks:** 37 | **License:** MIT
**Creator:** harishkotra
**Status:** Active. v0.0.2 released April 2026. Last commit May 2026.

**Stack:**
- TypeScript monorepo (npm workspaces)
- Phaser.js — pixel art office rendering
- Colyseus — real-time game server / state sync
- React — UI overlays (chat, task board, system log)
- Ollama — local LLM inference
- SQLite + Ollama embeddings — persistent memory + semantic search

**What it already has (the hard parts):**
- Phaser.js pixel art rendering pipeline
- Colyseus real-time state sync (multiplayer)
- Agent think loop: Perceive → Think → Act (every ~15s)
- SQLite memory + Ollama embeddings + cosine similarity recall
- Tool execution: code, web search, notes, file read
- Agent-to-agent conversations
- Dynamic hiring (agents can hire agents)
- Layout editor (drag/drop furniture)
- Viral mode + audience voting API (v0.0.2)
- Relationship graph (alliances, rivalries)

**What it was missing for our vision:**
- CEO/PA/Board Room spatial hierarchy (just "Alice and Bob at generic desks")
- CEO-as-user interface (human watches from outside, no "you are the CEO" framing)
- PA as orchestrator/router (all agents are peers, no gateway)
- Structured workflow engine (emergent chat, not pipelines)
- Pre-built specialist library (must edit source code to add agents)
- Real artifact production (output is conversation logs, not files)

**Critical observation:** v0.0.2 added viral mode (audience voting, chaos triggers, episode recaps). Creator went entertainment route, not utility route. 37 forks relative to 86 stars = developers see the potential. Someone will build on this. Window is 2-3 months.

**Decision:** Fork agent-office. Take the backend (Colyseus, SQLite, agent loops, tool execution). Replace Phaser.js UI with React Three Fiber from tenacitOS.

---

### 1.4 TenacitOS Repo Analysis

**Repo:** https://github.com/carlosazaustre/tenacitOS
**Stars:** 1.2k | **Forks:** 228 | **License:** MIT
**Creator:** carlosazaustre
**Status:** Released Feb 2026. Single maintainer.

**What it is:** Next.js 15 dashboard for OpenClaw AI agent instances. Not an agent system — purely a control panel/dashboard.

**Stack:**
- Next.js 15 (App Router)
- React 19 + Tailwind CSS v4
- React Three Fiber + Drei — 3D office (one desk per agent)
- Recharts — charts/analytics
- SQLite (better-sqlite3) — cost tracking
- Node.js 22

**Features:**
- OS-style UI shell (topbar, dock, status bar)
- Agent Dashboard (status, token usage, model, activity)
- Cost Tracking (real usage from SQLite)
- Cron Manager (visual, weekly timeline, manual triggers)
- Activity Feed (real-time, heatmap, charts)
- Memory Browser (explore, search, edit)
- File Browser (workspace navigation, in-browser edit)
- Global Search
- Real-time Notifications
- **Office 3D** — React Three Fiber, one voxel avatar per agent, configurable positions
- Terminal (read-only, command allowlist)
- Auth (password-protected, rate-limited, httpOnly cookie)

**Why it fits:** tenacitOS is the dashboard/control panel layer. agent-office is the agent runtime layer. They're designed for different things — which means combining them creates something neither has.

**What needed stripping:**
- All OpenClaw-specific data sources (openclaw.json reader, workspace paths)
- OpenClaw agent discovery logic
- Terminal (security risk for v1)
- Memory browser (v2)
- File browser (v2)
- Global search (v2)

**What's kept from tenacitOS:**
- Entire Next.js shell
- React Three Fiber 3D office (redesigned for CEO/PA/Board Room layout)
- Auth system
- Activity feed
- Cost tracking (wired to agent-office SQLite)
- Cron manager
- Notifications
- System monitor

---

### 1.5 Decisions Locked (Do Not Re-debate)

| Decision | Choice | Why |
|----------|--------|-----|
| **Product name** | AI_Headquarters (displayed: AI HQ) | Memorable, ownable, clear |
| **Default LLM** | Ollama (local, free) | Zero cost, full privacy, no API key friction |
| **BYOK options** | Claude, OpenAI, OpenRouter, Groq, Gemini | Bring your own key — user controls their spend |
| **Visual layer** | React Three Fiber 3D (tenacitOS approach) | Not Phaser.js pixel art — cleaner, fewer dependencies, no game engine overhead |
| **Agent runtime** | Colyseus (from agent-office) | Already built, proven, real-time state sync included |
| **Frontend framework** | Next.js 15 + Tailwind v4 (from tenacitOS) | Fast to build, easy for contributors, App Router patterns |
| **Memory** | SQLite + Ollama embeddings (from agent-office) | Local-first, zero infra, semantic recall built in |
| **Code sandbox** | Docker (not QEMU) | Ship now. QEMU is v2 hardening. |
| **Build approach** | Fork both repos (not build from scratch) | Saves 10-12 weeks. Both are MIT licensed. |
| **Launch target** | Browser-first | Faster than Electron. Desktop is v2. |

---

### 1.6 What's Been Cut (Do Not Re-add Without Explicit Decision)

| Feature | Reason Cut | When to Revisit |
|---------|-----------|-----------------|
| Phaser.js pixel art | Replaced by React Three Fiber | Never — different approach chosen |
| Viral mode / audience voting | Entertainment, not utility | v2 if traction proves entertainment angle |
| Relationship graph | Not utility-relevant for v1 | v2 |
| Terminal in dashboard | Security risk | v2 with proper sandboxing |
| Memory browser | v2 scope | After core workflow works |
| File browser | v2 scope | After core workflow works |
| Global search | v2 scope | After core workflow works |
| Voice mode | v2 scope | After launch |
| GitHub PR integration | v2 scope | After launch |
| Multiple office floors | v2 scope | After launch |
| QEMU microVMs | Over-engineering for v1 | v2 security hardening |
| LangGraph | Agent-office already uses Colyseus | Revisit if Colyseus proves wrong tool |

---

### 1.7 Architecture (Final)

**Monorepo structure:**
```
AI_Headquarters/
├── apps/
│   ├── dashboard/      ← tenacitOS fork (Next.js 15 + R3F)
│   └── server/         ← agent-office server fork (Colyseus)
├── packages/
│   ├── core/           ← agent-office core (state machine, memory, tasks)
│   ├── adapters/       ← Ollama + Claude + OpenAI + OpenRouter + Groq + Gemini
│   └── types/          ← shared TypeScript types (API contract)
├── output/             ← where agent output files land
├── docker-compose.yml
└── package.json
```

**Data flow:**
```
User (CEO) types in dashboard chat panel
  → POST /api/ceo/message
  → Colyseus server → Alex (PA agent)
  → PA routes to specialist agents
  → agents execute tools, write to output/
  → Colyseus events stream to dashboard WebSocket
  → 3D office updates, activity feed updates, task status updates
  → PA reports back to CEO with summary + file paths
```

**API contract:** Defined in `packages/types/src/index.ts` (see T-007 in TASK_QUEUE.md)

---

### 1.8 Pre-Built Agents at Launch

| ID | Name | Role | Default Tools |
|----|------|------|---------------|
| `pa` | Alex | PA / Orchestrator. Parses CEO commands, delegates, reports. Always first in the loop. CEO never talks directly to specialists. | All internal APIs |
| `dev` | Dev | Developer. Code writing, debugging, file ops. | code-exec, file-write, file-read, web-search |
| `researcher` | Ray | Researcher. Web research, synthesis, fact-checking. | web-search, file-write |
| `copywriter` | Cleo | Copywriter. Content, emails, landing page copy. | file-write, web-search |
| `analyst` | Max | Market Analyst. Market intel, competitor research. | web-search, file-write |

---

### 1.9 3D Office Layout

```
┌─────────────────────────────────────────┐
│  CEO CORNER (Jinu/user)  PA (Alex)      │
│  [No agent — human]      [PA desk]      │
│                                         │
│         BOARD ROOM                      │
│    [Round table — 4-6 seats]            │
│    PA convenes here for group decisions │
│                                         │
│  OPEN FLOOR (specialist desks)          │
│  [Dev]  [Ray]  [Cleo]  [Max]            │
│  [+hire slot]  [+hire slot]  ...        │
└─────────────────────────────────────────┘
```

Semantic meaning:
- Agent at desk = active work
- Agent in Board Room = multi-agent discussion (triggered by PA)
- PA walking to CEO corner = delivering a report
- Agent on sofa = idle

---

### 1.10 The Launch Demo Workflow (Must Work Perfectly at Launch)

**CEO types:** "Build me a landing page for a B2B SaaS that helps restaurants manage food waste"

**Expected flow:**
1. PA (Alex) receives → clarifies if needed → creates task plan
2. Assigns: Ray (market research 2 min) + Cleo (copy 1 min) + Dev (HTML 2 min)
3. Board Room: PA + Dev + Cleo align on output
4. Output lands in `output/landing-page/index.html` + `output/copy.md`
5. PA reports to CEO with summary + file paths

**Target:** Under 5 minutes with Claude API. This is the demo video that drives launch.

---

### 1.11 The 10,000 Stars Strategy

**Three phases:**

**Pre-launch (before public):**
- Mobilize seed network for 100-300 "ignition" stars
- README with 15-second animated GIF showing 3D office + agent executing task
- One-command Docker install in README
- Record 3-minute demo video (the landing page workflow, end-to-end)

**Launch window (Tuesday 9am ET):**
- HN: "Show HN: AI HQ — fork two MIT repos, get a local visual AI office where you are the CEO" (technical, non-promotional)
- Reddit: r/selfhosted, r/LocalLLaMA, r/SideProject
- Twitter/X: demo video + "I ran my own AI company for 48 hours" thread

**Post-launch sustain:**
- PRs to: awesome-agents, awesome-selfhosted, awesome-local-ai
- Weekly minor releases (shows active development, keeps repo on trending)
- 24-hour issue response time
- "⭐ Star this if you want to run your own AI startup" CTA in README

**The viral story:** "I built an AI office product using an AI office development setup — Claude Code as architect, Kilo Code and Cline as implementers. The product is the process." This goes in the HN post.

---

### 1.12 Top 5 Risks (Identified, Not Resolved)

| Risk | Mitigation |
|------|-----------|
| Colyseus ↔ Next.js integration messier than expected | API contract defined in types/ first. Mock server before wiring. |
| LLM latency (20-40s per action) makes 3D office feel broken | "Thinking" animation states. Stream responses. Claude API for demo, not just Ollama. |
| 3D agent movement disconnected from actual state | Colyseus events must drive 3D directly via WebSocket. No polling. |
| Scope creep kills Week 5-6 | Cut list is law. Nothing moves from v2 to v1 without Claude approval. |
| Ollama setup friction kills onboarding | Claude API as default in demo video. Ollama in README as local alternative. |

---

### 1.13 Dev Setup (Multi-Brain Protocol)

**Roles:**
- **Claude Code** = Principal architect. Specs tasks, architecture decisions, drift reviews. Never implements.
- **Kilo Code** (VS Code extension) = Primary implementer. Executes Brain=Kilo Code tasks.
- **Cline** (VS Code extension) = Secondary implementer. Brain=Cline tasks, complex or when Kilo is rate-limited.
- **Jinu** = CEO. Gives direction, confirms switches, reads output. Does not write code.

**Key files:**
- `TASK_QUEUE.md` — what to build (single source of truth)
- `CHANGELOG.md` — what was built (file-level log)
- `CLAUDE.md` — project context (read at session start)
- `AGENTS.md` — full protocol detail
- `PRODUCT_LOG.md` — this file (product thinking log)

**Review loop:** After every 5-7 tasks, Jinu tells Claude "review the project." Claude reads CHANGELOG + recent changes → fixes drift → adds/updates tasks.

---

### 1.14 Phase Map

| Phase | Goal | Exit Criteria | Weeks |
|-------|------|---------------|-------|
| 0 | Foundation — monorepo boots | `docker compose up` runs both apps | 1 |
| 1 | Strip & Wire Backend | Dashboard shows real agents from Colyseus | 2 |
| 2 | 3D Office Redesign | CEO/PA/Board Room/Floor layout with live state | 1 |
| 3 | CEO Interface + PA Orchestrator | CEO types → PA routes → something happens | 1.5 |
| 4 | Specialists + Tool Execution | All 5 agents produce file outputs | 2 |
| 5 | End-to-End Workflow | Landing page demo under 5 min | 1.5 |
| 6 | Launch Prep | README, Docker one-liner, demo GIF, HN draft | 0.5 |
| **Total** | | | **~10 weeks** |

---

### 1.15 Open Questions (Not Yet Decided)

| Question | Status |
|----------|--------|
| Contact harishkotra for collaboration? | Not decided. Fork-first, assess later. |
| Cloud version alongside local? | Not decided. Post-launch decision based on demand. |
| Paid tier / monetization? | Not decided. Stars first, revenue second. |
| Mobile companion app? | v3 at earliest. Not on the table now. |

---

## HOW TO UPDATE THIS LOG

At the end of every product planning session, Claude adds a new session block:

```
## SESSION N — YYYY-MM-DD
### "[Session title]"

### N.1 What was discussed
### N.2 Decisions made
### N.3 Things rejected and why
### N.4 Open questions updated
### N.5 What changed in the plan
```

Do not edit previous sessions. Append only. If a previous decision is reversed, note it in the new session with a reference to the original decision number.
