# AI HQ — Architecture

This document explains how the system is designed, why each major technology was chosen, and how the pieces connect. Read this before contributing to the server or core packages.

---

## Overview

AI HQ is a real-time multi-agent system with a 3D visual interface. Three layers:

```
Browser (dashboard)          Server                         Local machine
─────────────────────        ─────────────────────          ─────────────
Next.js 15 app           ←→  Colyseus room             ←→  Ollama (LLM)
React Three Fiber 3D     ←→  Express REST API           ←→  output/ files
CEO chat panel           ←→  SQLite memory store
Task board, agent list   ←→  Tool executor
```

---

## Why Colyseus?

Colyseus is a multiplayer game server framework. It was chosen because:

- **Authoritative state sync** — the server holds the canonical office state (agent positions, actions, tasks). Every client sees the same state. No client-side drift.
- **Room lifecycle** — a single `OfficeRoom` persists indefinitely (`autoDispose = false`). Agents keep running even with zero browser connections.
- **Deterministic broadcast** — `room.broadcast(event, payload)` delivers events to all connected dashboard clients simultaneously. This is what makes agent position updates, board meetings, and task completions appear in real time.
- **Schema-based state** — `OfficeState` uses Colyseus schemas for efficient binary delta encoding on the WebSocket.

An alternative (plain Socket.io + Express) would have worked but required manual state sync logic. Colyseus handles that for free.

---

## The Think Cycle

Every agent runs a "think cycle" — a periodic loop that generates autonomous behavior.

```
setSimulationInterval (100ms tick)
  └─ for each agent with currentTask:
       if lock is free:
         set lock = true
         agent.think(context) → decision
           ├─ action: 'work'      → broadcast agent:status
           ├─ action: 'talk'      → send message to target agent
           └─ action: 'use_tool'  → ToolExecutor.execute()
                                        ├─ code_execute  → vm.runInNewContext (sandboxed)
                                        ├─ web_search    → Tavily API or DuckDuckGo
                                        └─ write_file    → output/<agentId>/timestamp.ext
         release lock after 120s (throttles Ollama calls)
```

The 120-second lock prevents agents from flooding Ollama. A think cycle fires at most once every 2 minutes per agent.

**Key rule:** Agents only think when they have a `currentTask`. Idle agents (no task assigned) do not call Ollama.

---

## CEO Message Flow

The primary user-facing flow:

```
1. CEO types in dashboard chat panel
2. POST /api/ceo/message  →  server
3. Server sets SSE headers, opens streaming response
4. OfficeRoom.streamCeoMessage():
   a. PA agent set to 'thinking'
   b. LLM called (Ollama or BYOK adapter)
   c. PA response streams token-by-token via SSE
   d. PA parses routing instructions from response
   e. Tasks assigned to specialist agents (Dev, Ray, Cleo, Max)
   f. Specialists execute via think cycle (with Ollama)
   g. Output files written to output/<agentId>/
   h. task:completed broadcast → dashboard updates task board
   i. PA calls LLM again to synthesize final report
   j. SSE stream ends with { type: 'end' }
5. Dashboard renders streaming PA response in CEO chat
```

---

## BYOK Adapter System

All LLM calls go through an `InferenceAdapter` interface (`packages/core/src/agent/InferenceAdapter.ts`).

```
getAdapter(provider, apiKey):
  'ollama'      → OllamaAdapter     (local HTTP, no key needed)
  'openai'      → OpenAICompatibleAdapter(api.openai.com)
  'openrouter'  → OpenAICompatibleAdapter(openrouter.ai)   ← also handles 'anthropic' routing
  'groq'        → OpenAICompatibleAdapter(api.groq.com)
  'gemini'      → OpenAICompatibleAdapter(generativelanguage.googleapis.com/v1beta/openai)
```

The `OpenAICompatibleAdapter` works for any provider that implements the OpenAI chat completions API contract. All BYOK providers currently do.

**Important:** Anthropic's native API (`/v1/messages`) differs from the OpenAI schema. Currently, `anthropic` routes through OpenRouter (which accepts OpenAI format). A native `AnthropicAdapter` is on the v0.2.0 roadmap.

Provider and API key come from request headers (`x-llm-provider`, `x-api-key`), injected by the dashboard from localStorage. Keys are never stored on the server.

---

## Memory System

`packages/core` — in-memory short-term memory (agent's `memories[]` array, capped at 50).  
`apps/server/src/memory/MemoryStore.ts` — SQLite persistent storage (`data/office-memory.db`).

Memory flow:
- Agent makes a decision → memory saved to in-memory array
- 30% chance per think cycle → recent memories flushed to SQLite
- On room startup → top 20 memories per agent loaded from SQLite

SQLite schema (MemoryStore):
- `memories` — content, type, importance, embedding (optional, from Ollama embeddings API)
- `tasks` — title, assigned_to, status, output_path
- `usage_log` — tokens per session per agent

Semantic search via cosine similarity on Ollama embeddings is implemented but optional (requires `llama3.2` embedding model).

---

## Tool Executor

`apps/server/src/tools/ToolExecutor.ts`

All agent tool calls go through this class. Tools are sandboxed:

| Tool | Sandbox |
|------|---------|
| `code_execute` | `vm.runInNewContext` — no `process`, no `require`, 5s timeout |
| `write_file` | Writes only to `output/<agentId>/` — enforced by ToolExecutor |
| `read_file` | Reads only from `output/` — path resolved and prefix-checked |
| `web_search` | Tavily API (if key set) or DuckDuckGo Instant Answer fallback |

---

## 3D Office Layout

The 3D office is rendered in the browser by React Three Fiber. Agent positions are a 2D grid (x, y) in the Colyseus state, mapped to 3D world coordinates in the dashboard.

```
Grid coordinates → 3D world space:
  grid.x → world.x
  grid.y → world.z  (depth axis)
  fixed y = 0       (floor level)
```

Grid bounds: 2–36 on both axes. Agents clamp to bounds every movement tick.

Desk positions (hardcoded in `OfficeRoom.furnitureTargets`):
- PA: (5, 5)
- Dev: (5, 12)
- Researcher: (12, 12)
- Copywriter: (19, 12)
- Analyst: (26, 12)
- Board room seats: (13–17, 4–8)

---

## Monorepo Structure

```
packages/types      — shared TypeScript interfaces (Agent, Task, OfficeEvent)
                      source of truth for the server↔dashboard API contract
packages/core       — Agent state machine, memory, InferenceAdapter interface
packages/adapters   — OllamaAdapter, OpenAICompatibleAdapter, PromptBuilder
apps/server         — Colyseus room + Express REST API (imports packages/*)
apps/dashboard      — Next.js 15 app (imports packages/types only)
```

Build order: `types → core → adapters → server | dashboard`

All packages use the `@aihq/*` namespace.

---

## Data Flows Summary

```
CEO directive → PA (Ollama/BYOK)
             → task assignments → specialists (Ollama/BYOK)
             → tool execution → output files
             → board meeting (optional) → multi-agent Ollama calls
             → PA synthesis → final report → CEO
             → SQLite (tasks, memories, usage log)
             → Colyseus broadcast → dashboard WebSocket → 3D office + UI
```
