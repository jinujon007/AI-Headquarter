# AI HQ — API Reference

The server (`apps/server`) exposes REST endpoints and a Colyseus WebSocket connection.

Base URL (local): `http://localhost:3001`

---

## Authentication (optional)

If `AIHQ_SERVER_KEY` is set in the server environment, the mutating endpoints — `POST /api/ceo/message` and `POST /api/agents/hire` — require a matching header:

```
x-aihq-key: <your AIHQ_SERVER_KEY>
```

Requests without it get HTTP 401 `{ "ok": false, "error": "Unauthorized" }`. The dashboard's API routes inject this header server-side from their own environment, so the key never reaches the browser. When `AIHQ_SERVER_KEY` is unset (local dev default), no auth is required.

---

## REST Endpoints

### `GET /health`

Lightweight ping. Returns `{ ok: true }`.

---

### `GET /api/health`

Full health check including Ollama connectivity.

**Response:**
```json
{
  "ok": true,
  "ollamaConnected": true,
  "models": [{ "name": "llama3.2:3b", ... }],
  "activeAgents": 5,
  "uptime": 142.3
}
```

On Ollama failure: HTTP 503, `"ollamaConnected": false`, `"error": "message"`.

---

### `GET /api/agents`

Returns all agents currently in the office.

**Response:**
```json
[
  {
    "id": "pa",
    "name": "Alex",
    "role": "PA / Orchestrator",
    "status": "idle",
    "model": "llama3.2:3b",
    "provider": "ollama",
    "deskPosition": [-6, 0, -5],
    "currentTask": null
  }
]
```

---

### `POST /api/agents/hire`

Hire a new specialist agent (max 6 hired agents on top of the 5 core agents — 11 total).

**Request:**
```json
{ "name": "Jordan", "role": "Financial Analyst" }
```

**Response:**
```json
{ "ok": true, "agent": { "id": "hire_0", "name": "Jordan", "role": "Financial Analyst" } }
```

**Error:** HTTP 400 if `name` or `role` missing. HTTP 503 if no active room.

---

### `POST /api/ceo/message`

Send a directive from the CEO to the PA. **Streams via SSE.**

**Request:**
```json
{ "content": "Build a landing page for a SaaS that helps restaurants manage food waste" }
```

**Headers (optional — BYOK):**
```
x-llm-provider: openrouter
x-api-key: sk-or-...
```

Valid `x-llm-provider` values: `ollama` (default), `anthropic`, `openai`, `openrouter`, `groq`, `gemini`. The key is used for that request only — never stored server-side.

**Response:** `text/event-stream`. Each event is a JSON object on a `data:` line.

Event types:
```
{ "type": "token", "agentId": "pa", "token": "…the full PA reply…" }  ← PA acknowledgment (one chunk)
{ "type": "done",  "agentId": "pa" }                                  ← PA reply complete
{ "type": "end" }                                                     ← stream complete
{ "type": "error", "message": "..." }                                 ← on failure
```

The stream carries only the PA acknowledgment. Delegated work continues asynchronously after the stream ends — watch the Colyseus WebSocket events (`task:created`, `task:completed`, `agent:message` with `isReport: true`) for progress and the final report.

---

### `GET /api/tasks`

Returns task history from SQLite.

**Response:** rows come straight from SQLite in snake_case (`TaskRecord` in `@aihq/types`):
```json
[
  {
    "id": 1,
    "title": "Write landing page HTML",
    "assigned_to": "dev",
    "status": "completed",
    "output_path": "output/dev/2025-05-19T10-30-00-landing-page.html",
    "created_at": "2025-05-19T10:28:00",
    "completed_at": "2025-05-19T10:31:22"
  }
]
```

`status` is one of: `pending`, `in_progress`, `completed`, `failed`. Tasks left `pending`/`in_progress` by a crashed process are marked `failed` on the next server start.

---

### `GET /api/costs`

Aggregated usage and cost data (`CostsData` in `@aihq/types`), priced per model — local Ollama models cost $0.

**Response:**
```json
{
  "today": 0.04,
  "yesterday": 0.12,
  "thisMonth": 1.87,
  "lastMonth": 0,
  "projected": 3.2,
  "budget": 10,
  "byAgent": [{ "agent": "dev", "cost": 0.9, "tokens": 152000 }],
  "byModel": [{ "model": "claude-sonnet-4-5", "cost": 1.87, "tokens": 310000 }],
  "daily": [{ "date": "2026-07-28", "cost": 0.04, "input": 9000, "output": 4000 }],
  "hourly": []
}
```

`budget` is the configured monthly cap in USD, or `null` when no cap is set.

---

### `GET /api/settings` · `POST /api/settings`

Read or update server-persisted settings. `POST` requires the `x-aihq-key` header when `AIHQ_SERVER_KEY` is set.

```json
{ "ok": true, "budgetUsd": 10 }
```

`POST` body: `{ "budgetUsd": 10 }` — a non-negative number, or `null` to remove the cap. When month-to-date spend reaches the cap, paid-model calls are refused with an honest message; local Ollama is never blocked.

---

### `GET /api/logs`

Last 500 server console lines from an in-memory ring buffer (what the dashboard's Server Logs page polls).

```json
[{ "ts": "2026-07-28T16:00:00.000Z", "level": "log", "line": "[OfficeRoom] …" }]
```

---

### `GET /api/system`

Basic system metrics.

**Response:**
```json
{ "cpu": 1.24, "ram": 62, "disk": 0 }
```

---

### `GET /api/output?path=output/dev/file.html`

Read a file written by an agent. **Restricted to `output/` directory.**

**Response:**
```json
{ "ok": true, "content": "<!DOCTYPE html>...", "path": "output/dev/file.html" }
```

**Error:** HTTP 400 if path is outside `output/` or missing. HTTP 404 if file not found.

---

## Colyseus WebSocket

Connect to: `ws://localhost:3001` (Colyseus client SDK)

Room name: `"office"`

```typescript
import { Client } from 'colyseus.js';
const client = new Client('ws://localhost:3001');
const room = await client.joinOrCreate('office');
```

### State Schema

`room.state.agents` — MapSchema of agent states:
```
id        string
name      string
x         number   (grid x position)
y         number   (grid y position)
action    string   (idle | work | talk | thinking | in-meeting)
currentTask  string | null
thought   string   (agent's last thought, for debug)
```

`room.state.officeTime` — ISO timestamp, updated every tick.

---

### Server → Client Events

All events are received via `room.onMessage(type, handler)`.

#### `agent:status`
```typescript
{ type: 'agent:status', agentId: string, status: AgentStatus }
```

#### `agent:message`
```typescript
{ type: 'agent:message', agentId: string, message: string, targetId?: string }
```

#### `agent:action`
```typescript
{ type: 'agent:action', agentId: string, action: string, detail: string }
```

#### `agent:hired`
```typescript
{ type: 'agent:hired', agent: { id, name, role, status, provider, deskPosition } }
```

#### `task:created`
```typescript
{ type: 'task:created', task: { id, title, assignedTo, status, createdAt } }
```

#### `task:completed`
```typescript
{ type: 'task:completed', task: { id: string, title: string, assignedTo: string, status: 'completed', outputPath: string | null, completedAt: string } }
```

#### `task:failed`
```typescript
{ type: 'task:failed', task: { id: string, title: string, assignedTo: string, status: 'failed', error: string } }
```

#### `board:started`
```typescript
{ type: 'board:started', participants: string[], topic: string, seatAssignments: Record<string, {x, y}> }
```

#### `board:ended`
```typescript
{ type: 'board:ended', participants: string[], deskReturn: Record<string, {x, y}> }
```

---

### Client → Server Messages

#### `sync-request`
```typescript
room.send('sync-request');
```
Ask the server to push the current agent list (`agents-sync`) and recent tasks (`tasks-sync`) to this client. Send it once your `onMessage` handlers are registered.

CEO directives go through `POST /api/ceo/message` (REST + SSE) — there is no WebSocket message for them.

#### `assign-task`
```typescript
room.send('assign-task', { title: 'Task description', agentId: 'dev' });
```
Directly assigns a task. The CEO chat endpoint does this automatically.

---

## TypeScript Types

All shared types live in `packages/types/src/index.ts`:

```typescript
import type { AgentSummary, TaskRecord, CostsData, OfficeEvent, AgentStatus } from '@aihq/types';
```

Import this package in any workspace — it has zero runtime dependencies.
