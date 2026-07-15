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

Hire a new specialist agent (max 5 hired agents).

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
{ "type": "token",    "content": "I'll" }           ← streaming PA response token
{ "type": "status",   "agentId": "pa", "status": "thinking" }
{ "type": "task",     "title": "...", "assignedTo": "dev" }
{ "type": "end" }                                    ← stream complete
{ "type": "error",    "message": "..." }             ← on failure
```

---

### `GET /api/tasks`

Returns task history from SQLite.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Write landing page HTML",
    "assignedTo": "dev",
    "status": "completed",
    "outputPath": "output/dev/2025-05-19T10-30-00-landing-page.html",
    "createdAt": "2025-05-19T10:28:00",
    "completedAt": "2025-05-19T10:31:22"
  }
]
```

`status` is one of: `pending`, `in_progress`, `completed`, `failed`.

---

### `GET /api/costs`

Token usage and estimated cost per session.

**Response:**
```json
[
  {
    "agentId": "pa",
    "model": "llama3.2:3b",
    "date": "2025-05-19",
    "total_prompt_tokens": 1240,
    "total_completion_tokens": 380,
    "task_count": 3
  }
]
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

#### `ceo:message`
```typescript
room.send('ceo:message', { content: 'Your directive here' });
```
Routes to PA. For streaming responses, use the REST endpoint instead.

#### `assign-task`
```typescript
room.send('assign-task', { title: 'Task description', agentId: 'dev' });
```
Directly assigns a task. The CEO chat endpoint does this automatically.

---

## TypeScript Types

All shared types live in `packages/types/src/index.ts`:

```typescript
import type { Agent, Task, OfficeEvent, AgentStatus, SessionCost } from '@aihq/types';
```

Import this package in any workspace — it has zero runtime dependencies.
