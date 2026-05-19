# TASK_QUEUE.md — AI_Headquarters

Single source of truth for what to build. Read BRAIN_BRIEF.md before touching anything.

**Rules:**
- Mark IN-PROGRESS before starting any task
- One task at a time per brain
- Log to CHANGELOG.md when done (one line only)
- Never make architecture decisions — escalate to Claude via Jinu

---

## INDEX

| ID | Title | Brain | Status | Phase | Depends On |
|----|-------|-------|--------|-------|------------|
| T-001 | Create monorepo root structure | Kilo Code | DONE | 0 | — |
| T-002 | Copy agent-office packages into monorepo | Kilo Code | DONE | 0 | T-001 |
| T-003 | Copy tenacitOS into apps/dashboard | Kilo Code | DONE | 0 | T-001 |
| T-004 | Create root tsconfig.base.json | Kilo Code | DONE | 0 | T-001 |
| T-005 | Create root docker-compose.yml skeleton | Kilo Code | DONE | 0 | T-002, T-003 |
| T-006 | Create .env.example | Kilo Code | DONE | 0 | T-005 |
| T-007 | Create packages/types shared contract | Kilo Code | DONE | 0 | T-002 |
| T-008 | Audit: list all OpenClaw imports in dashboard | Cline | DONE | 0 | T-003 |
| T-009 | Server: rewrite index.ts as AIHQ REST API | Kilo Code | DONE | 1 | T-007 |
| T-010 | Server: replace Alice/Bob with AIHQ default agents | Claude Code | DONE | 1 | T-009 |
| T-011 | Server: add CEO message handler + PA response stub | Claude Code | DONE | 1 | T-010 |
| T-012 | Server: emit AIHQ WebSocket events, strip old events | Claude Code | DONE | 1 | T-010 |
| T-013 | Server: add GET /api/costs endpoint | Claude Code | DONE | 1 | T-009 |
| T-014 | Dashboard: fix lib/paths.ts — set SERVER_URL + API endpoints | Kilo Code | DONE | 1 | — |
| T-015 | Dashboard: replace /api/agents route — proxy to server | Claude Code | DONE | 1 | T-009, T-014 |
| T-016 | Dashboard: replace /api/tasks route — proxy to server | Claude Code | DONE | 1 | T-009 |
| T-017 | Dashboard: /api/costs — local SQLite (no server proxy needed) | Claude Code | DONE | 1 | T-013, T-014 |
| T-018 | Dashboard: add /api/ceo/message route — proxy to server | Claude Code | DONE | 1 | T-011 |
| T-019 | Dashboard: add /api/agents/hire route — proxy to server | Claude Code | DONE | 1 | T-009 |
| T-020 | Dashboard: /api/system — local OS metrics (no server proxy needed) | Claude Code | DONE | 1 | T-009, T-014 |
| T-021 | Dashboard: remove FileBrowser + /api/files (v2) | Claude Code | DONE | 1 | T-008 |
| T-022 | Dashboard: remove GlobalSearch + /api/search (v2) | Claude Code | DONE | 1 | T-008 |
| T-023 | Dashboard: remove terminal route (v2, security) | Claude Code | DONE | 1 | T-008 |
| T-024 | Dashboard: remove memory route + MemoryBrowser (v2) | Claude Code | DONE | 1 | T-008 |
| T-025 | Dashboard: remove /api/git + /api/browse + /api/media routes | Claude Code | DONE | 1 | T-008 |
| T-026 | Dashboard: remove /api/actions, /api/reports, /api/analytics, /api/skills | Claude Code | DONE | 1 | T-008 |
| T-027 | Dashboard: redesign agentsConfig.ts for AIHQ layout | Kilo Code | DONE | 1 | T-015 |
| T-028 | Dashboard: add CEO zone label to Office3D.tsx | Claude Code | DONE | 1 | T-027 |
| T-029 | Dashboard: wire agent status from /api/agents to 3D avatars | Claude Code | DONE | 1 | T-027 |
| T-030 | Dashboard: create Colyseus WebSocket client hook | Claude Code | DONE | 1 | T-012 |
| T-031 | Dashboard: wire agent:status WS events to 3D avatar state | Claude Code | DONE | 1 | T-030, T-029 |
| T-032 | Dashboard: wire agent:message WS events to activity feed | Claude Code | DONE | 1 | T-030 |
| T-033 | Dashboard: wire task:created/completed WS events to task board | Claude Code | DONE | 1 | T-030 |
| T-034 | Dashboard: create CEO chat panel component | Claude Code | DONE | 1 | T-018 |
| T-035 | Server: upgrade write_note → real write_file with output folder | Kilo Code | DONE | 2 | — |
| T-036 | Server: PA auto-routing — parse response, create tasks, unlock agents | Kilo Code | DONE | 2 | T-035 |
| T-037 | Dashboard: Tasks page — live task board from /api/tasks + WS events | Kilo Code | DONE | 2 | T-016 |
| T-038 | Dashboard: CEO Chat — typing indicator + localStorage history | Cline | DONE | 2 | T-034 |
| T-039 | Dashboard: Agents page — real cards from /api/agents, 5s poll, status | Cline | DONE | 2 | T-015 |
| T-040 | Dashboard: Settings — BYOK API keys form with localStorage | Claude Code | DONE | 2 | — |
| T-041 | Server: specialist execution — direct Ollama task inference + file output | Kilo Code | DONE | 2 | T-035, T-036 |
| T-042 | Server: task completion — completeTask in DB, broadcast task:completed, clear agent | Kilo Code | DONE | 2 | T-041 |
| T-043 | Dashboard: output viewer — task detail shows linked file content | Claude Code | DONE | 2 | T-042 |
| T-044 | README: setup guide + attribution (agent-office + tenacitOS) | Cline | DONE | 2 | — |
| T-045 | Server: PA completion synthesis — report back to CEO when all tasks done | Kilo Code | DONE | 3 | T-041 |
| T-046 | Server: BYOK adapter switching — read headers, select adapter per request | Kilo Code | DONE | 3 | T-045 |
| T-047 | Dashboard: Add Tasks to Sidebar nav + live active-task badge | Cline | DONE | 3 | — |
| T-048 | Dashboard: Agent hiring UI — hire button + modal on Agents page | Cline | DONE | 3 | T-047 |
| T-049 | Dashboard: Security cleanup — delete terminal route + old pixel art components | Cline | DONE | 3 | — |
| T-050 | Dashboard: BYOK header injection — CeoChat sends provider+key headers to server | Cline | DONE | 3 | T-046, T-047 |
| T-051 | Server: streaming PA response — SSE from Ollama to client, token by token | Kilo Code | DONE | 4 | T-046 |
| T-052 | Dashboard: CeoChat streaming — read SSE stream, progressive PA message render | Kilo Code | DONE | 4 | T-051, T-050 |
| T-053 | Server: CORS fix + /api/health endpoint | Kilo Code | DONE | 5 | T-051 |
| T-054 | Server: real /api/costs — token tracking per task + SQLite storage | Kilo Code | DONE | 5 | T-045 |
| T-055 | Server: session restore — send task history to new WebSocket clients on join | Kilo Code | DONE | 5 | T-054 |
| T-056 | Server: board meeting sequence — runBoardMeeting(), board:started/ended events | Kilo Code | DONE | 6 | T-055 |
| T-057 | Server: board room seat positions + agent movement override during meeting | Kilo Code | DONE | 6 | T-056 |
| T-058 | Server: specialist output quality v2 — better prompts, HTML detection, file extensions | Kilo Code | DONE | 7 | T-056 |
| T-059 | Server: BYOK streaming — OpenAICompatibleAdapter.stream() eliminates single-chunk fallback | Claude Code | DONE | 7 | T-053 |
| T-060 | Infrastructure: Dockerfile validation + .dockerignore | Kilo Code | DONE | 8 | T-005 |
| T-061 | Infrastructure: GitHub Actions CI — typecheck + build matrix | Kilo Code | DONE | 8 | T-060 |
| T-062 | Infrastructure: README launch polish + CONTRIBUTING.md | Kilo Code | DONE | 8 | T-044 |
| T-063 | Bug fix: restore `output` endpoint in paths.ts | Claude Code | DONE | 9 | T-043 |
| T-064 | Verification: TypeScript build across all packages | Kilo Code | READY | 9 | T-062 |
| T-065 | Verification: remove terminal route + final security sweep | Cline | READY | 9 | T-049 |
| T-066 | Integration: wire server cost data to dashboard costs page | Kilo Code | READY | 9 | T-054 |
| T-067 | Launch: demo GIF script + recording checklist | Cline | READY | 9 | T-065 |
| T-068 | Launch: GitHub repo push checklist + HN/PH draft | Claude Code | READY | 9 | T-067 |
| T-069 | Server: basic API smoke tests | Kilo Code | READY | 9 | T-064 |
| T-070 | Server: fix dev script — add watch mode | Kilo Code | READY | 9 | T-064 |
| T-071 | Infrastructure: Docker Compose healthchecks + startup order | Kilo Code | READY | 9 | T-053 |
| T-072 | Infrastructure: create .releaserc for semantic-release | Claude Code | READY | 9 | T-068 |
| T-073 | Cleanup: remove dead code — server db.ts + dashboard /api/office | Cline | READY | 9 | T-065 |
| T-074 | Security: add rate limiting to /api/ceo/message | Kilo Code | READY | 9 | T-070 |
| T-075 | Cleanup: remove @react-three/rapier from dashboard deps | Cline | READY | 9 | T-073 |

---

## DETAIL SPECS

---

### T-001 — Create monorepo root structure
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 0

---

### T-002 — Copy agent-office packages into monorepo
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 0

Copied agent-office into packages/core/, packages/adapters/, apps/server/. All renamed @agent-office/* to @aihq/*. tsconfig.json files extend tsconfig.base.json.

---

### T-003 — Copy tenacitOS into apps/dashboard
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 0

Copied tenacitOS into apps/dashboard/. Package renamed to @aihq/dashboard. Full source in place.

---

### T-004 — Create root tsconfig.base.json
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 0

tsconfig.base.json at root. All packages extend it.

---

### T-005 — Create root docker-compose.yml skeleton
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 0 | **Depends On:** T-002, T-003

**Goal:** One `docker compose up` boots server (3001) and dashboard (3000).

**Steps:**
1. Create `docker-compose.yml` at root:
```yaml
version: '3.8'
services:
  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - OLLAMA_URL=${OLLAMA_URL:-http://host.docker.internal:11434}
      - PORT=3001
    volumes:
      - ./output:/app/output
      - ./data:/app/data
    restart: unless-stopped
  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SERVER_URL=http://server:3001
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - AUTH_SECRET=${AUTH_SECRET}
    depends_on:
      - server
    restart: unless-stopped
```
2. Create `apps/server/Dockerfile`:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/server ./apps/server
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci --workspace=apps/server --workspace=packages/core --workspace=packages/adapters --workspace=packages/types
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/core
RUN npm run build --workspace=packages/adapters
RUN npm run build --workspace=apps/server
EXPOSE 3001
CMD ["npm", "start", "--workspace=apps/server"]
```
3. Create `apps/dashboard/Dockerfile`:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/dashboard ./apps/dashboard
RUN npm ci --workspace=apps/dashboard
RUN npm run build --workspace=apps/dashboard
EXPOSE 3000
CMD ["npm", "start", "--workspace=apps/dashboard"]
```

**Files:** CREATE docker-compose.yml, apps/server/Dockerfile, apps/dashboard/Dockerfile

**Escalate to Claude if:** Dockerfiles require context crossing package boundaries unexpectedly.

---

### T-006 — Create .env.example
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 0 | **Depends On:** T-005

**Goal:** Single .env.example at root with all required env vars.

**Steps:**
1. Create `.env.example` at root:
```
# Auth (required)
ADMIN_PASSWORD=change-me-strong-password
AUTH_SECRET=change-me-random-32-char-secret

# LLM — Default: Ollama (local, free)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# LLM — BYOK (optional)
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# OPENROUTER_API_KEY=sk-or-...
# GROQ_API_KEY=gsk_...
# GEMINI_API_KEY=...

# Server
PORT=3001
SERVER_URL=http://localhost:3001

# Dashboard
NEXT_PUBLIC_APP_TITLE=AI HQ
NEXT_PUBLIC_COMPANY_NAME=AI HEADQUARTERS
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```
2. Create `apps/dashboard/.env.local.example`:
```
# Copy this file to .env.local and fill in values from root .env.example
SERVER_URL=http://localhost:3001
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
ADMIN_PASSWORD=
AUTH_SECRET=
```

**Files:** CREATE .env.example, CREATE apps/dashboard/.env.local.example

**Escalate to Claude if:** New env vars discovered — add them here, never hard-code.

---

### T-007 — Create packages/types shared contract
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 0

packages/types/src/index.ts created with Agent, Task, CeoMessage, OfficeEvent, SessionCost types.

---

### T-008 — Audit: list all OpenClaw imports in dashboard
**Brain:** Cline | **Status:** DONE | **Phase:** 0 | **Depends On:** T-003

**Goal:** Do NOT change code. List every file in apps/dashboard/ that references OpenClaw.

**Steps:**
1. Search apps/dashboard/src/ for: `openclaw` (case insensitive), `OPENCLAW`, `/root/.openclaw`, `workspace-studio`, `workspace-infra`, `mission-control`
2. Also search for `from '@/lib/paths'` — the old paths.ts exported OPENCLAW_* constants; files importing it need replacement
3. For each match: file path, line number, what the reference does
4. Write full list to `(CAI)openclaw-audit.md` at project root
5. Do NOT modify source files

**Files:** READ apps/dashboard/src/ (search only — do not edit)

**Output:** CREATED (CAI)openclaw-audit.md

**Escalate to Claude if:** More than 20 distinct files have OpenClaw references.

---

### T-009 — Server: rewrite index.ts as AIHQ REST API
**Brain:** Kilo Code | **Status:** READY | **Phase:** 1 | **Depends On:** T-007

**Goal:** Replace agent-office server entrypoint with AIHQ REST API. Remove viral-mode routes. Add all AIHQ endpoints. Fix port to 3001.

**Steps:**
1. Replace apps/server/src/index.ts entirely:
```typescript
import express from 'express';
import { Server } from 'colyseus';
import { createServer } from 'http';
import { OfficeRoom } from './rooms/OfficeRoom';
import * as os from 'os';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/api/agents', (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? room.getAgentList() : []);
});

app.post('/api/agents/hire', (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) return res.status(503).json({ ok: false, error: 'No active room.' });
  const { name, role } = req.body || {};
  if (!name || !role) return res.status(400).json({ ok: false, error: 'name and role required' });
  const agent = room.hireAgent(name, role);
  res.json({ ok: true, agent });
});

app.post('/api/ceo/message', async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) return res.status(503).json({ ok: false, error: 'No active room.' });
  const { content } = req.body || {};
  if (!content) return res.status(400).json({ ok: false, error: 'content required' });
  const response = await room.receiveCeoMessage(content);
  res.json({ ok: true, response });
});

app.get('/api/tasks', async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? await room.getTaskList() : []);
});

app.get('/api/costs', async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? await room.getCosts() : []);
});

app.get('/api/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  res.json({
    cpu: os.loadavg()[0],
    ram: Math.round(((totalMem - freeMem) / totalMem) * 100),
    disk: 0,
  });
});

app.get('/health', (req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const colyseusServer = new Server({ server: httpServer });
colyseusServer.define('office', OfficeRoom);

const PORT = Number(process.env.PORT || 3001);
colyseusServer.listen(PORT).then(() => {
  console.log(`[AIHQ Server] Listening on port ${PORT}`);
});
```
2. In OfficeRoom.ts, add stub public methods (do NOT change existing logic):
```typescript
public getAgentList(): any[] { return []; }
public hireAgent(name: string, role: string): any { return { id: 'stub', name, role }; }
public async receiveCeoMessage(content: string): Promise<string> { return 'OK'; }
public async getTaskList(): Promise<any[]> { return []; }
public async getCosts(): Promise<any[]> { return []; }
```

**Files:**
- EDIT: apps/server/src/index.ts (full replacement)
- EDIT: apps/server/src/rooms/OfficeRoom.ts (add stub methods only)

**Escalate to Claude if:** TypeScript errors beyond missing method stubs.

---

### T-010 — Server: replace Alice/Bob with AIHQ default agents
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-009

**Goal:** Swap Alice+Bob for 5 AIHQ agents. Implement getAgentList() and getTaskList().

**Steps:**
1. Update setupCoreAgent signature: change `x: number, y: number` to `deskPosition: [number, number, number]`. Use deskPosition[0] for x, deskPosition[2] for y in grid.
2. Replace Alice/Bob setup calls with:
```typescript
await setupCoreAgent('pa',         'Alex', 'PA / Orchestrator', [-6, 0, -5]);
await setupCoreAgent('dev',        'Dev',  'Developer',         [-4, 0,  2]);
await setupCoreAgent('researcher', 'Ray',  'Researcher',        [ 0, 0,  2]);
await setupCoreAgent('copywriter', 'Cleo', 'Copywriter',        [ 4, 0,  2]);
await setupCoreAgent('analyst',    'Max',  'Market Analyst',    [ 8, 0,  2]);
```
3. Update furnitureTargets: alice-desk -> pa-desk, bob-desk -> dev-desk. Add researcher-desk, copywriter-desk, analyst-desk.
4. Implement getAgentList() replacing stub:
```typescript
public getAgentList(): any[] {
  return Array.from(this.coreAgents.entries()).map(([id, agent]) => ({
    id,
    name: agent.config.name,
    role: agent.config.role,
    status: this.state.agents.get(id)?.action || 'idle',
    model: agent.config.inference?.model || 'unknown',
    provider: 'ollama',
    deskPosition: (agent.config as any).deskPosition || [0, 0, 0],
    currentTask: agent.currentTask || undefined,
  }));
}
```
5. Implement getTaskList() replacing stub:
```typescript
public async getTaskList(): Promise<any[]> {
  return this.memoryStore.getTasks();
}
```

**Files:** EDIT apps/server/src/rooms/OfficeRoom.ts

**Escalate to Claude if:** Agent config type rejects deskPosition — list the TypeScript error.

---

### T-011 — Server: add CEO message handler + PA response stub
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-010

**Goal:** Wire CEO->PA message flow. PA acknowledges, logs, returns canned response. No LLM yet.

**Steps:**
1. Implement receiveCeoMessage() replacing stub:
```typescript
public async receiveCeoMessage(content: string): Promise<string> {
  const pa = this.coreAgents.get('pa');
  const paState = this.state.agents.get('pa');
  if (pa && paState) {
    paState.action = 'thinking';
    paState.currentTask = `CEO: ${content.slice(0, 60)}`;
    this.broadcast('agent:message', {
      type: 'agent:message', agentId: 'ceo', message: content, targetId: 'pa',
    });
    await this.memoryStore.saveMemory('pa', {
      content: `CEO said: "${content}"`,
      type: 'conversation',
      timestamp: new Date().toISOString(),
      importance: 1.0,
    }, this.sessionId);
    const response = `Got it. Analysing your request and delegating. Stand by.`;
    setTimeout(() => {
      if (paState) { paState.action = 'work'; paState.currentTask = undefined; }
      this.broadcast('agent:message', {
        type: 'agent:message', agentId: 'pa', message: response, targetId: 'ceo',
      });
    }, 2000);
    return response;
  }
  return 'PA agent not available.';
}
```
2. Replace old 'chat' onMessage handler with 'ceo:message':
```typescript
this.onMessage('ceo:message', async (client, message) => {
  const response = await this.receiveCeoMessage(message.content || '');
  client.send('pa:response', { message: response });
});
```

**Files:** EDIT apps/server/src/rooms/OfficeRoom.ts

**Escalate to Claude if:** memoryStore.saveMemory signature differs from above — list actual signature.

---

### T-012 — Server: emit AIHQ WebSocket events, strip old events
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-010

**Goal:** Replace agent-office broadcast types with AIHQ types. Delete all viral-mode code.

**Steps:**
1. DELETE these private methods entirely: registerAudienceVote(), getEpisodeRecap(), applyScenarioKickoff(), applyChaosEvent(), updateAgentViralMetrics(), rebuildRelationshipGraph(), updateRelationship(), emitRelationshipGraph(), buildRelationshipPayload(), emitHighlight()
2. DELETE private fields: relationships, audienceVotes, chaosHistory, highlights, currentScenario. DELETE HighlightEvent and RelationshipEdge interfaces.
3. DELETE onMessage handlers for: 'start-scenario', 'trigger-chaos', 'save-layout'
4. Replace broadcast('chat', ...) -> broadcast('agent:message', { type: 'agent:message', agentId, message })
5. Replace broadcast('task-update', ...) -> broadcast('task:created', { type: 'task:created', task: { id, title, assignedTo, status: 'in-progress', createdAt: new Date().toISOString() } })
6. After `agentState.action = decision.action`, add: `this.broadcast('agent:status', { type: 'agent:status', agentId: id, status: decision.action })`
7. In update(): remove all calls to deleted methods.

**Files:** EDIT apps/server/src/rooms/OfficeRoom.ts

**Escalate to Claude if:** Removing emitHighlight causes TypeScript errors beyond the direct call sites.

---

### T-013 — Server: add GET /api/costs endpoint
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-009

**Goal:** Implement getCosts() with SQLite data if available.

**Steps:**
1. Read apps/server/src/memory/MemoryStore.ts — check if getSessions() method exists.
2. If no getSessions(), check for a sessions table in the SQLite schema. If table exists, add to MemoryStore:
```typescript
async getSessions(): Promise<any[]> {
  try {
    const rows = await this.db.all('SELECT * FROM sessions ORDER BY started_at DESC LIMIT 100');
    return rows || [];
  } catch { return []; }
}
```
3. Implement getCosts() in OfficeRoom replacing stub:
```typescript
public async getCosts(): Promise<any[]> {
  try { return await this.memoryStore.getSessions?.() || []; }
  catch { return []; }
}
```

**Files:**
- READ + EDIT (maybe): apps/server/src/memory/MemoryStore.ts
- EDIT: apps/server/src/rooms/OfficeRoom.ts

**Escalate to Claude if:** No sessions table in the SQLite schema.

---

### T-014 — Dashboard: fix lib/paths.ts — set SERVER_URL + API endpoints
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 1 | **Depends On:** —

**Goal:** The current paths.ts has been changed to local filesystem paths (AIHQ_ROOT, AIHQ_OUTPUT_DIR etc). That is WRONG for the dashboard. The dashboard needs HTTP URL config to call the server, not filesystem paths. Replace the entire file.

**IMPORTANT:** The current content of paths.ts after recent edits uses local filesystem paths. This is incorrect. The dashboard runs in Next.js and calls the server over HTTP — it does NOT access the filesystem directly.

**Steps:**
1. Replace the ENTIRE contents of apps/dashboard/src/lib/paths.ts with:
```typescript
export const SERVER_URL =
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  'http://localhost:3001';

export const WS_URL = SERVER_URL
  .replace('http://', 'ws://')
  .replace('https://', 'wss://');

export const API = {
  agents:     `${SERVER_URL}/api/agents`,
  agentsHire: `${SERVER_URL}/api/agents/hire`,
  ceoMessage: `${SERVER_URL}/api/ceo/message`,
  tasks:      `${SERVER_URL}/api/tasks`,
  costs:      `${SERVER_URL}/api/costs`,
  system:     `${SERVER_URL}/api/system`,
};
```
2. Do NOT update other files that import from @/lib/paths yet — those are handled in T-015 through T-026. If other files fail to compile because they imported OPENCLAW_* or AIHQ_ROOT_* constants from paths.ts, note the file names in CHANGELOG but do not fix them yet.

**Files:** EDIT apps/dashboard/src/lib/paths.ts (full replacement)

**Escalate to Claude if:** More than 5 other files import constants from paths.ts that are now missing — list them all, stop. Claude will update T-008 audit scope.

---

### T-015 — Dashboard: replace /api/agents route — proxy to server
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-009, T-014

**Steps:**
1. Replace apps/dashboard/src/app/api/agents/route.ts entirely:
```typescript
import { NextResponse } from 'next/server';
import { API } from '@/lib/paths';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const res = await fetch(API.agents, { cache: 'no-store' });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}
```
2. Check apps/dashboard/src/app/api/agents/[id]/route.ts — if it reads from OpenClaw, replace with a 404 stub.

**Files:**
- EDIT: apps/dashboard/src/app/api/agents/route.ts
- EDIT (maybe): apps/dashboard/src/app/api/agents/[id]/route.ts

**Escalate to Claude if:** [id] route does something non-trivial beyond OpenClaw reads.

---

### T-016 — Dashboard: replace /api/tasks route — proxy to server
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-009

**Steps:**
1. Find tasks route in apps/dashboard/src/app/api/. Replace or create:
```typescript
import { NextResponse } from 'next/server';
import { API } from '@/lib/paths';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const res = await fetch(API.tasks, { cache: 'no-store' });
    return NextResponse.json(await res.json());
  } catch { return NextResponse.json([]); }
}
```

**Files:** EDIT or CREATE apps/dashboard/src/app/api/tasks/route.ts

**Escalate to Claude if:** Existing route has complex logic beyond data reads.

---

### T-017 — Dashboard: replace /api/costs route — proxy to server
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-013, T-014

**Steps:**
1. Replace apps/dashboard/src/app/api/costs/route.ts:
```typescript
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '30d';
    const res = await fetch(`${API.costs}?timeframe=${timeframe}`, { cache: 'no-store' });
    return NextResponse.json(await res.json());
  } catch { return NextResponse.json([]); }
}
```

**Files:** EDIT apps/dashboard/src/app/api/costs/route.ts

**Escalate to Claude if:** Route has POST/DELETE handlers that must be preserved.

---

### T-018 — Dashboard: add /api/ceo/message route — proxy to server
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-011

**Steps:**
1. Create apps/dashboard/src/app/api/ceo/message/route.ts:
```typescript
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(API.ceoMessage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Server unreachable' }, { status: 503 });
  }
}
```

**Files:** CREATE apps/dashboard/src/app/api/ceo/message/route.ts

---

### T-019 — Dashboard: add /api/agents/hire route — proxy to server
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-009

**Steps:**
1. Create apps/dashboard/src/app/api/agents/hire/route.ts:
```typescript
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(API.agentsHire, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Server unreachable' }, { status: 503 });
  }
}
```

**Files:** CREATE apps/dashboard/src/app/api/agents/hire/route.ts

**Escalate to Claude if:** Conflicts with existing /api/agents/[id] dynamic route.

---

### T-020 — Dashboard: replace /api/system route — proxy to server
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-009, T-014

**Steps:**
1. Replace apps/dashboard/src/app/api/system/route.ts:
```typescript
import { NextResponse } from 'next/server';
import { API } from '@/lib/paths';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const res = await fetch(API.system, { cache: 'no-store' });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ cpu: 0, ram: 0, disk: 0 });
  }
}
```

**Files:** EDIT apps/dashboard/src/app/api/system/route.ts

---

### T-021 — Dashboard: remove FileBrowser + /api/files (v2)
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-008

**Goal:** Remove FileBrowser and files route (v2, security risk).

**Steps:**
1. DELETE: apps/dashboard/src/app/api/files/
2. DELETE: apps/dashboard/src/components/FileBrowser.tsx, FileTree.tsx, FilePreview.tsx, MarkdownEditor.tsx, MarkdownPreview.tsx
3. DELETE (if exists): apps/dashboard/src/app/(dashboard)/files/
4. EDIT Sidebar.tsx: remove Files nav item
5. Search for FileBrowser imports — remove any found

**Files:** Multiple deletes + EDIT Sidebar.tsx

**Escalate to Claude if:** FileBrowser imported in more than 3 places outside Sidebar.tsx.

---

### T-022 — Dashboard: remove GlobalSearch + /api/search (v2)
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-008

**Steps:**
1. DELETE: apps/dashboard/src/app/api/search/
2. DELETE: apps/dashboard/src/components/GlobalSearch.tsx
3. DELETE (if exists): apps/dashboard/src/app/(dashboard)/search/
4. EDIT TopBar.tsx: remove search UI element

**Files:** Deletes + EDIT apps/dashboard/src/components/TenacitOS/TopBar.tsx

**Escalate to Claude if:** Search is wired to a keyboard shortcut handler not in TopBar.tsx.

---

### T-023 — Dashboard: remove terminal route (v2, security)
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-008

**Steps:**
1. DELETE: apps/dashboard/src/app/api/terminal/
2. DELETE (if exists): apps/dashboard/src/app/(dashboard)/terminal/
3. EDIT Sidebar.tsx: remove Terminal nav item

**Files:** Deletes + EDIT Sidebar.tsx

**Escalate to Claude if:** Terminal wired to auth middleware in a way that breaks other auth flows.

---

### T-024 — Dashboard: remove memory route + MemoryBrowser (v2)
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-008

**Steps:**
1. DELETE: apps/dashboard/src/app/api/memory/
2. DELETE (if exists): apps/dashboard/src/app/(dashboard)/memory/
3. EDIT Sidebar.tsx: remove Memory nav item

**Files:** Deletes + EDIT Sidebar.tsx

**Escalate to Claude if:** Memory route imports from packages/core in a way that causes errors.

---

### T-025 — Dashboard: remove /api/git, /api/browse, /api/media, /api/logs routes
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-008

**Steps:**
1. DELETE: apps/dashboard/src/app/api/git/
2. DELETE: apps/dashboard/src/app/api/browse/
3. DELETE: apps/dashboard/src/app/api/media/
4. DELETE: apps/dashboard/src/app/api/logs/
5. EDIT Sidebar.tsx: remove nav items for git, browse, media, logs

**Files:** Deletes + EDIT Sidebar.tsx

**Escalate to Claude if:** Any of these routes are imported by middleware.ts.

---

### T-026 — Dashboard: remove /api/actions, /api/reports, /api/analytics routes
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-008

**Steps:**
1. READ each route first — if it imports from @/lib/paths or references OpenClaw paths, delete it.
2. DELETE (if OpenClaw): apps/dashboard/src/app/api/actions/, reports/, analytics/
3. Keep notifications/ and weather/ if they do NOT import from @/lib/paths (read them first)
4. EDIT Sidebar.tsx: remove nav items for deleted routes

**Files:** READ then DELETE (conditional) + EDIT Sidebar.tsx

**Escalate to Claude if:** Notifications route handles WebSocket push.

---

### T-027 — Dashboard: redesign agentsConfig.ts for AIHQ layout
**Brain:** Kilo Code | **Status:** DONE | **Phase:** 1

agentsConfig.ts updated with AIHQ agent IDs (pa, dev, researcher, copywriter, analyst). Positions need alignment check in T-028 review. Export name changed from AGENTS to need verification.

---

### T-028 — Dashboard: add CEO zone label to Office3D.tsx
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-027

**Goal:** Add labeled CEO and Board Room zone markers in the 3D scene.

**Steps:**
1. First verify agentsConfig.ts exports: it must export DEFAULT_AGENTS (or AGENTS), CEO_ZONE, BOARD_ROOM_ZONE. If CEO_ZONE and BOARD_ROOM_ZONE don't exist yet, add them to agentsConfig.ts first:
```typescript
export const CEO_ZONE = { position: [-10, 0, -5] as [number, number, number], label: 'CEO (You)' };
export const BOARD_ROOM_ZONE = { position: [0, 0, -8] as [number, number, number], label: 'Board Room' };
```
2. Read Office3D.tsx to understand scene structure.
3. Import CEO_ZONE, BOARD_ROOM_ZONE from ./agentsConfig.
4. Check @react-three/drei exports Text and Box. If yes, add to scene:
```tsx
<group position={CEO_ZONE.position}>
  <Box args={[3, 0.05, 3]}><meshStandardMaterial color="#FFD700" opacity={0.3} transparent /></Box>
  <Text position={[0, 0.5, 0]} fontSize={0.4} color="#FFD700" anchorX="center">{CEO_ZONE.label}</Text>
</group>
<group position={BOARD_ROOM_ZONE.position}>
  <Box args={[6, 0.05, 4]}><meshStandardMaterial color="#4a4a6a" opacity={0.3} transparent /></Box>
  <Text position={[0, 0.5, 0]} fontSize={0.4} color="#aaaaff" anchorX="center">{BOARD_ROOM_ZONE.label}</Text>
</group>
```

**Files:** EDIT apps/dashboard/src/components/Office3D/agentsConfig.ts (add missing exports), READ + EDIT Office3D.tsx

**Escalate to Claude if:** @react-three/drei does not export Text or Box.

---

### T-029 — Dashboard: wire agent status from /api/agents to 3D avatars
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-027

**Goal:** Fetch live agents every 5s. Use status to change 3D avatar color by state.

**Steps:**
1. In Office3D.tsx, add state: `const [agentStates, setAgentStates] = useState<Record<string, string>>({})`.
2. Add useEffect polling /api/agents every 5000ms — update agentStates map.
3. Pass agentStates to AgentDesk. Use status to set color: idle=original, thinking=yellow, working=green, talking=blue, in-meeting=orange.

**Files:** EDIT Office3D.tsx, EDIT AgentDesk.tsx

**Escalate to Claude if:** AgentDesk structure makes adding status prop non-trivial.

---

### T-030 — Dashboard: create Colyseus WebSocket client hook
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-012

**Goal:** React hook connecting to Colyseus and exposing AIHQ events.

**Steps:**
1. Check apps/dashboard/package.json — add "colyseus.js": "^0.15.0" if not present. Run npm install from dashboard workspace.
2. Create apps/dashboard/src/lib/use-office-ws.ts:
```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import * as Colyseus from 'colyseus.js';

export type OfficeWSEvent = { type: string; [key: string]: any };

export function useOfficeWS(serverUrl: string) {
  const roomRef = useRef<Colyseus.Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<OfficeWSEvent | null>(null);

  useEffect(() => {
    const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const client = new Colyseus.Client(wsUrl);
    client.joinOrCreate('office').then((room) => {
      roomRef.current = room;
      setConnected(true);
      ['agent:status','agent:message','task:created','task:completed','agent:hired'].forEach(
        evt => room.onMessage(evt, (data: any) => setLastEvent({ type: evt, ...data }))
      );
    }).catch(err => console.warn('[useOfficeWS]', err));
    return () => { roomRef.current?.leave(); };
  }, [serverUrl]);

  return { connected, lastEvent };
}
```

**Files:** CREATE apps/dashboard/src/lib/use-office-ws.ts, EDIT (maybe) apps/dashboard/package.json

**Escalate to Claude if:** Colyseus client version mismatch with server.

---

### T-031 — Dashboard: wire agent:status WS events to 3D avatar state
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-030, T-029

**Steps:**
1. In Office3D.tsx, import useOfficeWS and WS_URL.
2. Call useOfficeWS(WS_URL). On lastEvent.type === 'agent:status', update agentStates.

**Files:** EDIT apps/dashboard/src/components/Office3D/Office3D.tsx

**Escalate to Claude if:** Office3D.tsx is a server component (must be 'use client').

---

### T-032 — Dashboard: wire agent:message WS events to activity feed
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-030

**Steps:**
1. Find where ActivityFeed renders (likely main page or activity page).
2. Use useOfficeWS there. On lastEvent.type === 'agent:message', prepend to local wsMessages state (cap at 50).
3. Pass wsMessages to ActivityFeed as prop or show as separate "Live" section.

**Files:** READ + EDIT the page rendering ActivityFeed

**Escalate to Claude if:** ActivityFeed has complex internal data model making a prop non-trivial.

---

### T-033 — Dashboard: wire task:created/completed WS events to task board
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-030

**Steps:**
1. Find or create a task display area in the dashboard.
2. Fetch /api/tasks on mount for initial list.
3. Use useOfficeWS: on task:created prepend; on task:completed update status to 'done'.

**Files:** READ + EDIT main or tasks dashboard page

**Escalate to Claude if:** No existing task page and adding to main page conflicts with existing layout.

---

### T-034 — Dashboard: create CEO chat panel component
**Brain:** Kilo Code | **Status:** BLOCKED | **Phase:** 1 | **Depends On:** T-018

**Goal:** CEO types command, sends to PA, sees response. Core user-facing interaction.

**Steps:**
1. Create apps/dashboard/src/components/CeoChat.tsx:
```tsx
'use client';
import { useState } from 'react';

export function CeoChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([
    { sender: 'system', text: 'Type a command. Alex (PA) will delegate to the team.' }
  ]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'CEO', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ceo/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'Alex (PA)', text: data.response || 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'system', text: 'Server unreachable.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.sender === 'CEO' ? 'text-right' : 'text-left'}`}>
            <span className="font-bold text-xs text-gray-400">{m.sender}</span>
            <div className={`rounded p-2 mt-1 inline-block max-w-xs ${m.sender === 'CEO' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-4 border-t border-gray-700">
        <input className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm outline-none"
          placeholder="Give Alex a command..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} />
        <button className="bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          onClick={send} disabled={loading}>{loading ? '...' : 'Send'}</button>
      </div>
    </div>
  );
}
```
2. Add `<CeoChat />` to apps/dashboard/src/app/(dashboard)/page.tsx in a visible panel area.

**Files:**
- CREATE: apps/dashboard/src/components/CeoChat.tsx
- EDIT: apps/dashboard/src/app/(dashboard)/page.tsx

**Escalate to Claude if:** Main page layout makes adding a panel impossible without breaking layout.

---

### T-040 — Dashboard: Settings — BYOK API keys form with localStorage
**Brain:** Claude Code | **Status:** DONE | **Phase:** 2

Fixed by Claude Code after Roo Code produced broken output (hooks-in-loop, stub comments, missing quotes on directive). Rebuilt as a proper `BYOKSection` component with per-field `useState`, useEffect for loading from localStorage, and per-field Save buttons with 2s "Saved" confirmation. QuickActions retained. SystemInfo/IntegrationStatus dropped (shape mismatch with AIHQ `/api/system` endpoint).

---

### T-041 — Server: specialist execution — direct Ollama task inference + file output
**Brain:** Kilo Code | **Status:** READY | **Phase:** 2 | **Depends On:** T-035, T-036

**Why this matters:** This is the critical path to the demo. Right now PA delegates tasks to specialists and they get `currentTask` set — but nothing actually runs. Specialists sit in the generic think cycle which produces conversational output, not deliverables. This task makes agents actually execute work and produce output files.

**Context (read first):**
- `OfficeRoom.ts` lines 178–315: the existing think cycle. It runs when `!thinkingLocks.get(id) && coreAgent.currentTask`. After tool execution it resets the lock to 120s. This is fine for idle chatter. It is NOT what we use for task execution.
- `MemoryStore.ts` line 153: `createTask()` returns `taskId: number`. Currently stored in local var in `receiveCeoMessage` but never kept for later use.
- `ToolExecutor.ts` lines 120–138: `writeNote()` writes to `output/{agentId}/{timestamp}-{slug}.md` and returns `{ success: true, output: "File written: output/dev/..." }`. The relative path is in `result.output`.

**Steps:**

1. Add private field to OfficeRoom class (after `private hireCount`):
```typescript
private activeTaskIds: Map<string, number> = new Map();
```

2. In `receiveCeoMessage`, find the block that stores taskId (line ~482):
```typescript
const taskId = await this.memoryStore.createTask(taskTitle, agentId);
```
Immediately after that line, add:
```typescript
this.activeTaskIds.set(agentId, taskId);
```

3. After unlocking the think lock (`this.thinkingLocks.set(agentId, false)`), add a call to the new method:
```typescript
this.runSpecialistTask(agentId, taskId, taskTitle);
```

4. Add the new method to OfficeRoom (after `receiveCeoMessage`):
```typescript
private async runSpecialistTask(agentId: string, taskId: number, taskTitle: string): Promise<void> {
    const agent = this.coreAgents.get(agentId);
    const agentState = this.state.agents.get(agentId);
    if (!agent || !agentState) return;

    const ROLE_PROMPTS: Record<string, string> = {
        dev:        'You are Dev, a developer. Write the complete code or technical deliverable for the task. Output the full file content — no summaries, no placeholders.',
        researcher: 'You are Ray, a researcher. Write a complete research brief covering key facts, data, and sources relevant to the task. Be thorough and cite specifics.',
        copywriter: 'You are Cleo, a copywriter. Write the complete copy deliverable — full text, no placeholders, no meta-commentary. Just the deliverable.',
        analyst:    'You are Max, a market analyst. Write a complete analysis brief with market data, competitive landscape, and actionable insights for the task.',
    };

    const systemPrompt = ROLE_PROMPTS[agentId] ||
        `You are ${agent.config.name}, a ${agent.config.role}. Complete the assigned task fully. Output only the deliverable.`;

    agentState.action = 'work';
    this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'working' });

    try {
        const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
        const result = await this.ollamaAdapter.complete({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Task: ${taskTitle}\n\nProduce the complete deliverable now.` },
            ],
            temperature: 0.7,
        });

        const output = result.content.trim();
        if (!output) throw new Error('Empty output from specialist');

        const toolResult = await this.toolExecutor.execute('write_file', {
            content: output,
            agentId,
            filename: taskTitle.slice(0, 40),
        });

        // T-042: task completion
        const outputPath = toolResult.success
            ? toolResult.output.replace('File written: ', '').trim()
            : undefined;

        await this.memoryStore.completeTask(taskId);
        this.activeTaskIds.delete(agentId);

        agent.currentTask = undefined;
        agentState.currentTask = undefined;
        agentState.action = 'idle';

        this.broadcast('task:completed', {
            type: 'task:completed',
            task: {
                id: `task_${taskId}`,
                title: taskTitle,
                assignedTo: agentId,
                status: 'completed',
                outputPath: outputPath || null,
                completedAt: new Date().toISOString(),
            },
        });

        this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'idle' });
        this.broadcast('agent:message', {
            type: 'agent:message',
            agentId,
            message: toolResult.success
                ? `Task complete. Output at: ${outputPath}`
                : `Task complete. Output written.`,
            targetId: 'pa',
        });

        await this.memoryStore.saveMemory(agentId, {
            content: `Completed task: "${taskTitle}". Output: ${outputPath || 'in-memory'}`,
            type: 'task_result',
            timestamp: new Date().toISOString(),
            importance: 0.9,
        }, this.sessionId);

    } catch (err) {
        console.error(`[${agentId}] runSpecialistTask error:`, err);
        agentState.action = 'idle';
        agentState.currentTask = undefined;
        agent.currentTask = undefined;
        this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'idle' });
    }
}
```

**Files:** EDIT apps/server/src/rooms/OfficeRoom.ts

**Escalate to Claude if:**
- `ollamaAdapter.complete()` signature differs from what's shown (check the call in `receiveCeoMessage` — use the same pattern)
- TypeScript error on `agent.currentTask = undefined` — use `null` if the type requires it

---

### T-042 — Server: task completion — completeTask in DB, broadcast task:completed, clear agent
**Brain:** Kilo Code | **Status:** READY | **Phase:** 2 | **Depends On:** T-041

**Note:** T-042 is fully included in the `runSpecialistTask` method spec in T-041. The completion logic (lines beginning `// T-042: task completion` in the T-041 spec) handles everything:
- `memoryStore.completeTask(taskId)` — marks task done in SQLite with completed_at timestamp
- `activeTaskIds.delete(agentId)` — cleans up tracking map
- Clears `agent.currentTask` and `agentState.currentTask`
- Broadcasts `task:completed` event with outputPath
- Resets agent to idle

**No additional file changes needed if T-041 is implemented as specced.**

**Verify after T-041:**
1. Run server, send a CEO message that triggers Ray or Cleo
2. Wait for `task:completed` broadcast in dashboard WebSocket feed
3. Check `output/{agentId}/` folder — file should exist
4. Query `/api/tasks` — task status should show `completed`

---

### T-044 — README: setup guide + attribution
**Brain:** Cline | **Status:** DONE | **Phase:** 2

**Goal:** Single README.md at root. Developer can clone, follow steps, and have the app running locally in under 10 minutes.

**Sections (in this order):**

1. **AI HQ — AI Startup Simulator** (H1 + 2-line pitch: "local-first browser dashboard where you are the CEO")

2. **Demo** — placeholder line: `> Demo GIF coming soon`

3. **Quick Start** (numbered steps):
   1. Clone the repo
   2. `cp .env.example .env` — fill in ADMIN_PASSWORD and AUTH_SECRET
   3. Install Ollama + pull model: `ollama pull llama3.1:8b`
   4. `npm install`
   5. `npm run dev` — starts server (3001) + dashboard (3000)
   6. Open http://localhost:3000 — login with ADMIN_PASSWORD

4. **BYOK (Optional)** — one line each for Claude, OpenAI, OpenRouter, Groq, Gemini — direct user to Settings page in dashboard

5. **Architecture** — copy the architecture block from CLAUDE.md verbatim (the apps/server + packages tree)

6. **Attribution** (required by MIT license):
   - agent-office by harishkotra — MIT License — link to repo
   - TenacitOS by carlosazaustre — MIT License — link to repo

7. **License** — MIT

**Files:** CREATE README.md at project root

**Do NOT:** Add anything not listed above. No badges, no contributing guide, no roadmap, no screenshots section (demo GIF placeholder covers it).

---

### T-045 — Server: PA completion synthesis — report back to CEO when all tasks done
**Brain:** Kilo Code | **Status:** READY | **Phase:** 3 | **Depends On:** T-041

**Goal:** Close the loop. Right now PA delegates and goes quiet. CEO never gets a final report. When all specialists finish their tasks from a single CEO message, PA must synthesize the outputs and send a final report back.

**Context (read first):**
- `OfficeRoom.ts` — `receiveCeoMessage()` creates tasks and calls `runSpecialistTask()` for each agent. It uses `activeTaskIds: Map<string, number>` to track running tasks.
- `runSpecialistTask()` at the end broadcasts `task:completed` and deletes from `activeTaskIds`.
- We need a mechanism: when the last task from a batch completes, PA fires a synthesis.

**Steps:**

1. Add a private field to track batch task counts (after `activeTaskIds`):
```typescript
private pendingBatchTasks: Map<string, { total: number; completed: number; titles: string[]; outputPaths: string[] }> = new Map();
private batchIdCounter = 0;
```

2. In `receiveCeoMessage()`, before the `for` loop that calls `runSpecialistTask`, generate a batchId and register the batch:
```typescript
const batchId = `batch_${++this.batchIdCounter}`;
const agentIds = agentsToDelegate; // the array of agentIds being delegated to
this.pendingBatchTasks.set(batchId, {
  total: agentIds.length,
  completed: 0,
  titles: [],
  outputPaths: [],
});
```
Then pass `batchId` to each `runSpecialistTask` call:
```typescript
this.runSpecialistTask(agentId, taskId, taskTitle, batchId);
```

3. Update `runSpecialistTask` signature:
```typescript
private async runSpecialistTask(agentId: string, taskId: number, taskTitle: string, batchId?: string): Promise<void>
```

4. In `runSpecialistTask`, after the successful `task:completed` broadcast (and before the error catch), add:
```typescript
if (batchId && this.pendingBatchTasks.has(batchId)) {
  const batch = this.pendingBatchTasks.get(batchId)!;
  batch.completed++;
  batch.titles.push(taskTitle);
  if (outputPath) batch.outputPaths.push(outputPath);
  if (batch.completed >= batch.total) {
    this.pendingBatchTasks.delete(batchId);
    await this.synthesizeAndReport(batch.titles, batch.outputPaths);
  }
}
```

5. Add `synthesizeAndReport` method after `runSpecialistTask`:
```typescript
private async synthesizeAndReport(taskTitles: string[], outputPaths: string[]): Promise<void> {
  const paState = this.state.agents.get('pa');
  if (paState) { paState.action = 'thinking'; }
  this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'thinking' });

  const taskList = taskTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const fileList = outputPaths.length > 0
    ? outputPaths.map(p => `- ${p}`).join('\n')
    : '(no files)';

  try {
    const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    const result = await this.ollamaAdapter.complete({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are Alex, the PA. Your team just completed a batch of tasks. Write a crisp, professional completion report to the CEO. 3-5 sentences. Cover: what was delivered, where to find the files, and one clear next action if obvious. No bullet lists — flowing prose only.',
        },
        {
          role: 'user',
          content: `Tasks completed:\n${taskList}\n\nOutput files:\n${fileList}\n\nWrite the completion report.`,
        },
      ],
      temperature: 0.6,
    });

    const report = result.content.trim() || `All ${taskTitles.length} tasks completed. Check the Tasks page for output files.`;

    this.broadcast('agent:message', {
      type: 'agent:message',
      agentId: 'pa',
      message: report,
      targetId: 'ceo',
      isReport: true,
    });
  } catch {
    this.broadcast('agent:message', {
      type: 'agent:message',
      agentId: 'pa',
      message: `All ${taskTitles.length} tasks completed. Check the Tasks page for output files.`,
      targetId: 'ceo',
      isReport: true,
    });
  } finally {
    if (paState) { paState.action = 'idle'; }
    this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'idle' });
  }
}
```

**Files:** EDIT `apps/server/src/rooms/OfficeRoom.ts`

**Escalate to Claude if:**
- `agentsToDelegate` variable name differs — read the actual `receiveCeoMessage` and find the array of agentIds being looped over
- `ollamaAdapter.complete()` signature changed — use whatever pattern is already in `runSpecialistTask`
- TypeScript errors on batch Map generics

---

### T-046 — Server: BYOK adapter switching — read headers, select adapter per request
**Brain:** Kilo Code | **Status:** READY | **Phase:** 3 | **Depends On:** T-045

**Goal:** Make BYOK real. Right now `ollamaAdapter` is hardcoded. When a request carries `X-Llm-Provider` and `X-Api-Key` headers, use that provider instead of Ollama.

**Context:**
- `packages/adapters/src/OllamaAdapter.ts` — `complete(options)` exists
- `packages/adapters/src/OpenAICompatibleAdapter.ts` — same interface, takes `baseURL + apiKey` in constructor. Works for OpenAI, OpenRouter, Groq, Gemini (OpenAI-compatible).
- Anthropic Claude uses a different API — for now, treat Claude as OpenRouter-compatible (model: `anthropic/claude-sonnet-4-5`) OR create a thin wrapper.

**Steps:**

1. Read `packages/adapters/src/OpenAICompatibleAdapter.ts` — confirm constructor signature is `(baseURL: string, apiKey: string)` and `complete(options)` exists.

2. Add a helper method to `OfficeRoom`:
```typescript
private getAdapter(provider?: string, apiKey?: string): OllamaAdapter | any {
  if (!provider || !apiKey) return this.ollamaAdapter;

  const PROVIDER_URLS: Record<string, string> = {
    openai:      'https://api.openai.com/v1',
    openrouter:  'https://openrouter.ai/api/v1',
    groq:        'https://api.groq.com/openai/v1',
    gemini:      'https://generativelanguage.googleapis.com/v1beta/openai',
    anthropic:   'https://openrouter.ai/api/v1',  // route Claude via OpenRouter
  };

  const baseURL = PROVIDER_URLS[provider.toLowerCase()];
  if (!baseURL) return this.ollamaAdapter;

  const { OpenAICompatibleAdapter } = require('@aihq/adapters');
  return new OpenAICompatibleAdapter(baseURL, apiKey);
}
```

3. Update `receiveCeoMessage` signature to accept optional provider/key:
```typescript
public async receiveCeoMessage(content: string, provider?: string, apiKey?: string): Promise<string>
```

4. Inside `receiveCeoMessage`, replace `this.ollamaAdapter.complete(...)` with:
```typescript
const adapter = this.getAdapter(provider, apiKey);
const result = await adapter.complete({ model, messages, temperature });
```

5. Also pass provider/apiKey through to `runSpecialistTask`:
```typescript
private async runSpecialistTask(agentId: string, taskId: number, taskTitle: string, batchId?: string, provider?: string, apiKey?: string): Promise<void>
```
Inside `runSpecialistTask`, replace `this.ollamaAdapter.complete(...)` with `this.getAdapter(provider, apiKey).complete(...)`.

6. In `apps/server/src/index.ts`, update the `POST /api/ceo/message` handler to extract and pass headers:
```typescript
app.post('/api/ceo/message', async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) return res.status(503).json({ ok: false, error: 'No active room.' });
  const { content } = req.body || {};
  if (!content) return res.status(400).json({ ok: false, error: 'content required' });
  const provider = req.headers['x-llm-provider'] as string | undefined;
  const apiKey  = req.headers['x-api-key'] as string | undefined;
  const response = await room.receiveCeoMessage(content, provider, apiKey);
  res.json({ ok: true, response });
});
```

**Files:**
- EDIT `apps/server/src/rooms/OfficeRoom.ts`
- EDIT `apps/server/src/index.ts`

**Escalate to Claude if:**
- `OpenAICompatibleAdapter` constructor differs from `(baseURL, apiKey)` — list actual signature
- `require('@aihq/adapters')` fails — check if named export exists, use import instead
- Model name for provider must be specified per-request (OpenAI vs Groq use different model names) — escalate with model name question

---

### T-047 — Dashboard: Add Tasks to Sidebar nav + live active-task badge
**Brain:** Cline | **Status:** READY | **Phase:** 3 | **Depends On:** —

**Goal:** Tasks page exists at `/tasks` but is unreachable — no link in Sidebar. Fix this. Also add a live badge showing count of in-progress tasks.

**Steps:**

1. Open `apps/dashboard/src/components/Sidebar.tsx`.

2. Add `CheckSquare` to the lucide-react import line (it's already importing from lucide-react).

3. In `navItems`, add after the Agents entry:
```typescript
{ href: "/tasks", label: "Tasks", icon: CheckSquare },
```

4. Add a badge: In the sidebar nav item render, for the Tasks link specifically, show a small orange dot when there are active tasks. To do this:
   - Add state: `const [activeTaskCount, setActiveTaskCount] = useState(0)`
   - Add useEffect to poll `/api/tasks` every 5s, count items where `status !== 'completed'`, update state
   - In the nav item for `/tasks`, append after the label: `{activeTaskCount > 0 && <span style={{ marginLeft: 'auto', background: 'var(--warning, #f97316)', color: '#fff', borderRadius: '9999px', fontSize: '10px', padding: '1px 6px', fontWeight: 700 }}>{activeTaskCount}</span>}`

**Files:** EDIT `apps/dashboard/src/components/Sidebar.tsx`

**Escalate to Claude if:** The nav item render structure doesn't have room for a trailing badge without layout changes.

---

### T-048 — Dashboard: Agent hiring UI — hire button + modal on Agents page
**Brain:** Cline | **Status:** IN-PROGRESS | **Phase:** 3 | **Depends On:** T-047

**Goal:** CEO should be able to hire new specialist agents from the dashboard. The endpoint exists (`POST /api/agents/hire`). Build the UI.

**Steps:**

1. Open `apps/dashboard/src/app/(dashboard)/agents/page.tsx`.

2. Add hire state at top of component:
```typescript
const [showHireModal, setShowHireModal] = useState(false);
const [hireName, setHireName] = useState('');
const [hireRole, setHireRole] = useState('');
const [hiring, setHiring] = useState(false);
const [hireError, setHireError] = useState('');
```

3. Add "Hire Agent" button in the page header area (top right, next to existing title):
```tsx
<button
  onClick={() => { setShowHireModal(true); setHireError(''); setHireName(''); setHireRole(''); }}
  style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
>
  + Hire Agent
</button>
```

4. Add modal at the bottom of the JSX (before closing fragment):
```tsx
{showHireModal && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem', width: '360px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Hire New Agent</h2>
      <input
        placeholder="Agent name (e.g. Jordan)"
        value={hireName}
        onChange={e => setHireName(e.target.value)}
        style={{ background: 'var(--card-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
      />
      <input
        placeholder="Role (e.g. Financial Analyst)"
        value={hireRole}
        onChange={e => setHireRole(e.target.value)}
        style={{ background: 'var(--card-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
      />
      {hireError && <p style={{ color: 'var(--error)', fontSize: '13px', margin: 0 }}>{hireError}</p>}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowHireModal(false)} style={{ background: 'var(--card-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Cancel
        </button>
        <button
          disabled={hiring || !hireName.trim() || !hireRole.trim()}
          onClick={async () => {
            setHiring(true); setHireError('');
            try {
              const res = await fetch('/api/agents/hire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: hireName.trim(), role: hireRole.trim() }) });
              const data = await res.json();
              if (!data.ok) throw new Error(data.error || 'Hire failed');
              setShowHireModal(false);
              // refresh agent list
              const agentsRes = await fetch('/api/agents');
              setAgents(await agentsRes.json());
            } catch (e: any) { setHireError(e.message); }
            finally { setHiring(false); }
          }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', opacity: (hiring || !hireName.trim() || !hireRole.trim()) ? 0.5 : 1 }}
        >
          {hiring ? 'Hiring...' : 'Hire'}
        </button>
      </div>
    </div>
  </div>
)}
```

5. Verify `setAgents` is the existing state setter for the agents list — if the variable is named differently, use that.

**Files:** EDIT `apps/dashboard/src/app/(dashboard)/agents/page.tsx`

**Escalate to Claude if:** Agents state setter name differs or the page uses a different data fetching pattern (SWR, React Query etc).

---

### T-049 — Dashboard: Security cleanup — delete terminal route + old pixel art components
**Brain:** Cline | **Status:** READY | **Phase:** 3 | **Depends On:** —

**Goal:** Remove dead/dangerous code that should not be in the repo.

**Steps:**

1. DELETE `apps/dashboard/src/app/api/terminal/route.ts` — security risk (T-023 missed it).

2. DELETE the entire `apps/dashboard/src/components/office/` directory. It contains old Phaser/Habbo/Stardew/Zelda pixel art components that were replaced by React Three Fiber. Files:
   - `HabboCharacter.tsx`, `HabboFurniture.tsx`, `HabboRoom.tsx`
   - `OfficeCanvas.tsx`, `PixelCharacter.tsx`
   - `StardewCharacter.tsx`, `StardewFurniture.tsx`, `StardewRoom.tsx`
   - `ZeldaCharacter.tsx`, `ZeldaFurniture.tsx`, `ZeldaRoom.tsx`

3. Before deleting: grep `apps/dashboard/src` for imports of any of these component names. If any import found outside `components/office/` itself — list them, do NOT delete, escalate.

4. If no external imports found: delete all files above.

5. Log every deleted file in CHANGELOG.

**Files:** DELETE (conditional on grep) `apps/dashboard/src/app/api/terminal/route.ts` + `apps/dashboard/src/components/office/`

**Escalate to Claude if:**
- Any file outside `components/office/` imports from it
- `terminal/route.ts` imports shared middleware that other routes need

---

### T-050 — Dashboard: BYOK header injection — CeoChat sends provider+key headers to server
**Brain:** Cline | **Status:** READY | **Phase:** 3 | **Depends On:** T-046, T-047

**Goal:** Wire the Settings BYOK keys into the CEO chat request. When a user has saved an API key in Settings, it must travel from the browser → Next.js proxy → server → adapter.

**Context:**
- Settings page saves keys to `localStorage` under keys: `byok_anthropic`, `byok_openai`, `byok_openrouter`, `byok_groq`, `byok_gemini`.
- The active provider priority: if `byok_anthropic` is set → use `anthropic`. Else `openai` → `openrouter` → `groq` → `gemini`. If none → Ollama (no headers sent).
- Server (T-046) reads `x-llm-provider` and `x-api-key` request headers.

**Steps:**

1. Open `apps/dashboard/src/components/CeoChat.tsx`.

2. Add a helper inside the component (or as a module-level function):
```typescript
function getActiveLLMHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const priority = [
    { provider: 'anthropic',  key: localStorage.getItem('byok_anthropic') },
    { provider: 'openai',     key: localStorage.getItem('byok_openai') },
    { provider: 'openrouter', key: localStorage.getItem('byok_openrouter') },
    { provider: 'groq',       key: localStorage.getItem('byok_groq') },
    { provider: 'gemini',     key: localStorage.getItem('byok_gemini') },
  ];
  const active = priority.find(p => p.key && p.key.trim().length > 0);
  if (!active) return {};
  return {
    'x-llm-provider': active.provider,
    'x-api-key': active.key!,
  };
}
```

3. In the `send()` function, change the fetch call to include these headers:
```typescript
const res = await fetch('/api/ceo/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...getActiveLLMHeaders(),
  },
  body: JSON.stringify({ content: msg }),
});
```

4. Open `apps/dashboard/src/app/api/ceo/message/route.ts`.

5. Update it to forward the LLM headers to the server:
```typescript
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const provider = request.headers.get('x-llm-provider');
    const apiKey   = request.headers.get('x-api-key');
    if (provider) forwardHeaders['x-llm-provider'] = provider;
    if (apiKey)   forwardHeaders['x-api-key'] = apiKey;

    const res = await fetch(API.ceoMessage, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Server unreachable' }, { status: 503 });
  }
}
```

6. Also add a small UI indicator in CeoChat: below the input bar, show which provider is active:
```tsx
const activeProvider = typeof window !== 'undefined'
  ? (['anthropic','openai','openrouter','groq','gemini'].find(p => localStorage.getItem(`byok_${p}`)?.trim()) || 'ollama')
  : 'ollama';
// Show in the input bar area:
<span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
  via {activeProvider}
</span>
```

**Files:**
- EDIT `apps/dashboard/src/components/CeoChat.tsx`
- EDIT `apps/dashboard/src/app/api/ceo/message/route.ts`

**Escalate to Claude if:** localStorage key names differ from above — check Settings page to find actual key names used.

---

### T-051 — Server: streaming PA response — SSE from Ollama to client, token by token
**Brain:** Kilo Code | **Status:** READY | **Phase:** 4 | **Depends On:** T-046

**Goal:** Replace the blocking POST response with Server-Sent Events (SSE). PA tokens stream to the browser as Ollama produces them. Perceived wait drops from ~15s to ~2s (first token). Option 2 (specialist streaming) is v2 — do not implement it here.

**Context (read first):**
- `packages/adapters/src/OllamaAdapter.ts` — has `complete()`. Add `stream()` alongside it. Do NOT touch `complete()`.
- `apps/server/src/rooms/OfficeRoom.ts` — `receiveCeoMessage()` handles PA inference + routing. We are adding `streamCeoMessage()` as a new public method that streams tokens, then delegates routing. The existing `receiveCeoMessage()` stays intact and is called internally for routing.
- `apps/server/src/index.ts` — `POST /api/ceo/message` currently returns JSON. Replace with SSE.

**Steps:**

**Step 1 — Add `stream()` to OllamaAdapter** (`packages/adapters/src/OllamaAdapter.ts`):

Add this method to the class after `complete()`:
```typescript
async stream(options: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  onToken: (token: string) => void;
  onDone: () => void;
  temperature?: number;
}): Promise<string> {
  const response = await fetch(`${this.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      options: { temperature: options.temperature ?? 0.7 },
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          fullText += data.message.content;
          options.onToken(data.message.content);
        }
        if (data.done === true) {
          options.onDone();
        }
      } catch {
        // incomplete chunk — skip
      }
    }
  }

  return fullText;
}
```

**Step 2 — Add `streamCeoMessage()` to OfficeRoom** (`apps/server/src/rooms/OfficeRoom.ts`):

Add as a public method before `receiveCeoMessage`. This method handles the PA streaming response only. After streaming, it calls `receiveCeoMessage` internally to handle all routing (task creation, agent delegation). This avoids duplicating routing logic.

```typescript
public async streamCeoMessage(
  content: string,
  provider: string | undefined,
  apiKey: string | undefined,
  emit: (event: object) => void,
): Promise<void> {
  const paState = this.state.agents.get('pa');
  if (!paState) {
    emit({ type: 'error', message: 'PA agent not available.' });
    return;
  }

  paState.action = 'thinking';
  this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'thinking' });

  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  const systemPrompt = `You are Alex, the PA and orchestrator. Respond to the CEO's command in 2-3 natural sentences. If you need specialists, briefly mention who (Dev, Ray, Cleo, or Max) and why. Be direct and confident.`;

  let fullResponse = '';

  try {
    if (!provider || !apiKey) {
      // Ollama — stream tokens
      fullResponse = await this.ollamaAdapter.stream({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content },
        ],
        temperature: 0.7,
        onToken: (token) => emit({ type: 'token', agentId: 'pa', token }),
        onDone: () => emit({ type: 'done', agentId: 'pa' }),
      });
    } else {
      // BYOK — complete() then emit as single chunk
      const adapter = this.getAdapter(provider, apiKey);
      const result = await adapter.complete({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content },
        ],
        temperature: 0.7,
      });
      fullResponse = result.content?.trim() || 'On it.';
      emit({ type: 'token', agentId: 'pa', token: fullResponse });
      emit({ type: 'done', agentId: 'pa' });
    }
  } catch {
    fullResponse = 'Got it. Analysing and delegating. Stand by.';
    emit({ type: 'token', agentId: 'pa', token: fullResponse });
    emit({ type: 'done', agentId: 'pa' });
  }

  // Broadcast PA message to WS clients (activity feed)
  this.broadcast('agent:message', {
    type: 'agent:message',
    agentId: 'pa',
    message: fullResponse,
    targetId: 'ceo',
  });

  // Delegate routing to existing method — re-runs PA inference but handles all task creation correctly
  // Accept the double inference cost for now (Option 2 in v2 will eliminate it)
  try {
    await this.receiveCeoMessage(content, provider, apiKey);
  } catch {
    // routing failure is non-fatal — PA already responded
  }
}
```

**Step 3 — Update index.ts to serve SSE** (`apps/server/src/index.ts`):

Replace the `POST /api/ceo/message` handler:
```typescript
app.post('/api/ceo/message', async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) {
    res.status(503).json({ ok: false, error: 'No active room.' });
    return;
  }
  const { content } = req.body || {};
  if (!content) {
    res.status(400).json({ ok: false, error: 'content required' });
    return;
  }

  const provider = req.headers['x-llm-provider'] as string | undefined;
  const apiKey   = req.headers['x-api-key'] as string | undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const emit = (event: object) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await room.streamCeoMessage(content, provider, apiKey, emit);
  } catch (err) {
    emit({ type: 'error', message: 'Internal server error' });
  } finally {
    if (!res.writableEnded) res.end();
  }
});
```

**Files:**
- EDIT `packages/adapters/src/OllamaAdapter.ts` — add `stream()` method
- EDIT `apps/server/src/rooms/OfficeRoom.ts` — add `streamCeoMessage()` public method
- EDIT `apps/server/src/index.ts` — replace POST /api/ceo/message with SSE handler

**Escalate to Claude if:**
- `response.body.getReader()` is not available (Node fetch polyfill issue) — list Node version and fetch import
- `res.flushHeaders()` not found — check Express version in `apps/server/package.json`
- `receiveCeoMessage` signature differs from `(content, provider?, apiKey?)` — list actual signature
- TypeScript error on `getAdapter()` not found — it was added in T-046; confirm T-046 is DONE first

---

### T-052 — Dashboard: CeoChat streaming — read SSE stream, progressive PA message render
**Brain:** Cline | **Status:** READY | **Phase:** 4 | **Depends On:** T-051, T-050

**Goal:** CeoChat reads the SSE stream from T-051. PA response builds up word by word in its chat bubble. User sees tokens arriving in real time instead of waiting 15+ seconds for a complete response.

**Context (read first):**
- `apps/dashboard/src/components/CeoChat.tsx` — T-050 already modified this file. Read current state before editing. Preserve `getActiveLLMHeaders()` and everything T-050 added.
- `apps/dashboard/src/app/api/ceo/message/route.ts` — T-050 updated this to forward BYOK headers. We now also need to forward the SSE stream, not buffer it as JSON.

**Steps:**

**Step 1 — Update dashboard proxy route** (`apps/dashboard/src/app/api/ceo/message/route.ts`):

Replace the file entirely — preserve BYOK header forwarding from T-050, add SSE forwarding:
```typescript
import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const provider = request.headers.get('x-llm-provider');
    const apiKey   = request.headers.get('x-api-key');
    if (provider) forwardHeaders['x-llm-provider'] = provider;
    if (apiKey)   forwardHeaders['x-api-key'] = apiKey;

    const res = await fetch(API.ceoMessage, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', message: 'Server unreachable' })}\n\n`,
        { status: 503, headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Server unreachable' })}\n\n`,
      { status: 503, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
}
```

**Step 2 — Update message type in CeoChat.tsx**:

Find the existing message type (inline or named). Add `id` and `streaming` fields:
```typescript
type Message = { sender: string; text: string; id: string; streaming?: boolean };
```
Update the initial `messages` state to include `id` on each entry.

**Step 3 — Replace the `send()` function**:

Replace the entire `send` function body (keep the function declaration):
```typescript
const send = async () => {
  if (!input.trim() || loading) return;
  const msg = input.trim();
  setInput('');
  setMessages(prev => [...prev, { sender: 'CEO', text: msg, id: `ceo_${Date.now()}` }]);
  setLoading(true);

  const streamMsgId = `pa_${Date.now()}`;
  setMessages(prev => [...prev, { sender: 'Alex (PA)', text: '', id: streamMsgId, streaming: true }]);

  try {
    const res = await fetch('/api/ceo/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getActiveLLMHeaders() },
      body: JSON.stringify({ content: msg }),
    });

    if (!res.body) throw new Error('No stream');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'token' && event.token) {
            setMessages(prev => prev.map(m =>
              m.id === streamMsgId ? { ...m, text: m.text + event.token } : m
            ));
          }
          if (event.type === 'done') {
            setMessages(prev => prev.map(m =>
              m.id === streamMsgId ? { ...m, streaming: false } : m
            ));
          }
          if (event.type === 'error') {
            setMessages(prev => prev.map(m =>
              m.id === streamMsgId ? { ...m, text: event.message || 'Error.', streaming: false } : m
            ));
          }
        } catch { /* malformed SSE line */ }
      }
    }
  } catch {
    setMessages(prev => prev.map(m =>
      m.id === streamMsgId ? { ...m, text: 'Server unreachable.', streaming: false } : m
    ));
  } finally {
    setLoading(false);
  }
};
```

**Step 4 — Add blinking cursor in message render**:

In the JSX where message text is rendered, append after the text content when `m.streaming` is true:
```tsx
{m.streaming && (
  <span style={{
    display: 'inline-block',
    width: '2px',
    height: '1em',
    background: 'currentColor',
    marginLeft: '2px',
    verticalAlign: 'text-bottom',
    animation: 'blink 1s step-end infinite',
  }} />
)}
```
Add keyframe to the nearest `<style>` tag or global CSS: `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`. If no `<style>` tag exists, add `<style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>` before the return JSX.

**Files:**
- EDIT `apps/dashboard/src/app/api/ceo/message/route.ts` (full replacement — BYOK + SSE forwarding)
- EDIT `apps/dashboard/src/components/CeoChat.tsx` (type update + `send()` replacement + cursor)

**Escalate to Claude if:**
- T-050 added logic to route.ts not in the replacement above — merge it, do not drop it
- `res.body.getReader()` causes TypeScript error in the browser — confirm `ReadableStream` types are available
- Tailwind config conflicts with inline `animation` style — use `animate-pulse` as fallback cursor

---

## PHASE 5 — Server Hardening

---

### T-053 — Server: CORS fix + /api/health endpoint
**Brain:** Kilo Code | **Status:** READY | **Phase:** 5 | **Depends On:** T-051

**Goal:** Fix a silent blocker (BYOK headers rejected by CORS) and add a health endpoint the dashboard can poll to detect Ollama connectivity.

**Context:**
- `apps/server/src/index.ts` line ~14: `Access-Control-Allow-Headers: 'Content-Type'` — missing `x-llm-provider` and `x-api-key`. Every BYOK request is silently dropped with a CORS preflight failure.
- The dashboard needs to know if Ollama is running so it can show a warning banner. There is no health endpoint today.

**Steps:**

1. In `apps/server/src/index.ts`, find the CORS middleware block:
```typescript
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```
Replace with:
```typescript
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-llm-provider, x-api-key');
```

2. Add a GET /api/health route after the existing `/health` route:
```typescript
app.get('/api/health', async (req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  let ollamaConnected = false;
  let models: string[] = [];
  try {
    const r = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const data = await r.json();
      ollamaConnected = true;
      models = (data.models || []).map((m: any) => m.name);
    }
  } catch { /* Ollama not running */ }
  res.json({
    ok: true,
    ollamaConnected,
    models,
    activeAgents: OfficeRoom.getActiveRoom()?.getAgentList().length ?? 0,
    uptime: Math.floor(process.uptime()),
  });
});
```

**Files:** EDIT `apps/server/src/index.ts`

**Escalate to Claude if:** `AbortSignal.timeout` not available (Node < 17) — replace with `Promise.race` with a 3s timeout promise.

---

### T-054 — Server: real /api/costs — token tracking per task + SQLite
**Brain:** Kilo Code | **Status:** READY | **Phase:** 5 | **Depends On:** T-045

**Goal:** `/api/costs` currently returns an empty array. Wire in real token counts from task execution so the Costs page shows meaningful data.

**Context:**
- `OllamaAdapter.complete()` returns `usage: { prompt: number, completion: number }` from Ollama's `prompt_eval_count` and `eval_count`. These are already being returned — they're just not being stored.
- `MemoryStore` (`apps/server/src/memory/MemoryStore.ts`) has SQLite. Add a `usage_log` table.
- `OfficeRoom.runSpecialistTask()` calls `adapter.complete()` — the return value is `result`. Log usage there.
- BYOK providers via `OpenAICompatibleAdapter` may return usage in `data.usage.prompt_tokens` / `data.usage.completion_tokens` — check the adapter's complete() return.

**Steps:**

1. Open `apps/server/src/memory/MemoryStore.ts`. In `initialize()`, add the usage_log table after the existing table creation:
```typescript
await this.db.exec(`
  CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    task_id INTEGER,
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);
```

2. Add a method to MemoryStore:
```typescript
async logUsage(sessionId: string, agentId: string, taskId: number | null, model: string, promptTokens: number, completionTokens: number): Promise<void> {
  await this.db.run(
    `INSERT INTO usage_log (session_id, agent_id, task_id, model, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, agentId, taskId, model, promptTokens, completionTokens]
  );
}

async getUsageSummary(): Promise<any[]> {
  return this.db.all(`
    SELECT agent_id, model,
      SUM(prompt_tokens) as total_prompt,
      SUM(completion_tokens) as total_completion,
      COUNT(*) as task_count,
      date(created_at) as day
    FROM usage_log
    GROUP BY agent_id, model, day
    ORDER BY day DESC
    LIMIT 100
  `);
}
```

3. In `OfficeRoom.runSpecialistTask()`, after `const result = await adapter.complete(...)`, call:
```typescript
await this.memoryStore.logUsage(
  this.sessionId,
  agentId,
  taskId,
  model,
  result.usage?.prompt || 0,
  result.usage?.completion || 0
);
```

4. In `OfficeRoom`, update `getCosts()`:
```typescript
public async getCosts(): Promise<any[]> {
  return this.memoryStore.getUsageSummary();
}
```

**Files:**
- EDIT `apps/server/src/memory/MemoryStore.ts`
- EDIT `apps/server/src/rooms/OfficeRoom.ts`

**Escalate to Claude if:** `this.db.run` / `this.db.all` don't match the actual MemoryStore SQLite API — read MemoryStore.ts first to find the correct DB call pattern.

---

### T-055 — Server: session restore — send task history to new WebSocket clients on join
**Brain:** Kilo Code | **Status:** READY | **Phase:** 5 | **Depends On:** T-054

**Goal:** When a new browser tab connects to the WebSocket, the dashboard should immediately receive the last 50 tasks and the current agent states — not just the live feed going forward.

**Context:**
- `OfficeRoom.onJoin()` currently sends `tasks-sync` and `agents-sync`. The task fetch from `memoryStore.getTasks()` only returns tasks created this session (check if true — read MemoryStore.getTasks implementation).
- We want the last 50 tasks regardless of session, sorted newest first.

**Steps:**

1. Open `apps/server/src/memory/MemoryStore.ts`. Find or add a method `getRecentTasks(limit: number)`:
```typescript
async getRecentTasks(limit = 50): Promise<any[]> {
  return this.db.all(
    `SELECT id, title, assigned_to as assignedTo, status,
      created_at as createdAt, completed_at as completedAt
     FROM tasks ORDER BY id DESC LIMIT ?`,
    [limit]
  );
}
```

2. In `OfficeRoom.onJoin()`, replace the existing tasks-sync with:
```typescript
onJoin(client: Client, options: any) {
  console.log(client.sessionId, 'joined');
  Promise.all([
    this.memoryStore.getRecentTasks(50),
    Promise.resolve(this.getAgentList()),
  ]).then(([tasks, agents]) => {
    client.send('tasks-sync', tasks);
    client.send('agents-sync', agents);
  }).catch(err => console.error('[onJoin] sync error:', err));
}
```

3. Also on `OfficeRoom.onCreate()`, after `await this.memoryStore.initialize()`, load the last usage summary and log it so we have continuity:
```typescript
const recentTasks = await this.memoryStore.getRecentTasks(50);
console.log(`[AIHQ] Restored ${recentTasks.length} tasks from previous sessions`);
```
(No further action needed — just log for confirmation that persistence works.)

**Files:**
- EDIT `apps/server/src/memory/MemoryStore.ts`
- EDIT `apps/server/src/rooms/OfficeRoom.ts`

**Escalate to Claude if:** MemoryStore's SQLite column names for tasks differ from `title`, `assigned_to`, `status`, `created_at`, `completed_at` — read the CREATE TABLE statement first.

---

## PHASE 6 — Board Meeting Sequence

---

### T-056 — Server: board meeting sequence — runBoardMeeting(), board:started/ended events
**Brain:** Kilo Code | **Status:** READY | **Phase:** 6 | **Depends On:** T-055

**Goal:** The 3D office's hero feature. When PA receives a command that involves 3+ agents, it triggers a board meeting: agents "move" to the meeting table, PA facilitates a structured discussion, each specialist contributes, then the meeting ends and agents return to work. This is the moment the 3D office feels alive.

**Context:**
- `OfficeRoom.receiveCeoMessage()` builds `mentionedAgents[]`. Currently just delegates silently. Add board meeting trigger when `mentionedAgents.length >= 2` (use 2 not 3 — the demo needs to trigger reliably).
- `broadast('board:started', ...)` and `broadcast('board:ended', ...)` are new WS events the dashboard (T-057's 3D upgrade) will listen for.
- Board meeting uses Ollama — each specialist gets one inference call for their 2-sentence contribution.

**Steps:**

1. Add a `private isBoardMeetingActive = false;` field to OfficeRoom after `batchIdCounter`.

2. Add `private boardRoomPositions` as a constant map of seat positions (reuse furnitureTargets but temporarily override):
```typescript
private boardSeats: Array<{ x: number; y: number }> = [
  { x: 13, y: 5 }, { x: 15, y: 4 }, { x: 17, y: 5 },
  { x: 13, y: 7 }, { x: 15, y: 8 }, { x: 17, y: 7 },
];
```

3. Add the `runBoardMeeting` method:
```typescript
private async runBoardMeeting(participants: string[], topic: string): Promise<void> {
  if (this.isBoardMeetingActive) return;
  this.isBoardMeetingActive = true;

  // Move participants + PA to board seats
  const inMeeting = ['pa', ...participants];
  this.broadcast('board:started', {
    type: 'board:started',
    participants: inMeeting,
    topic,
    seats: this.boardSeats,
  });

  inMeeting.forEach((id, i) => {
    const state = this.state.agents.get(id);
    if (state && this.boardSeats[i]) {
      state.x = this.boardSeats[i].x;
      state.y = this.boardSeats[i].y;
      state.action = 'in-meeting';
    }
    this.broadcast('agent:status', { type: 'agent:status', agentId: id, status: 'in-meeting' });
  });

  // PA opens the meeting
  this.broadcast('agent:message', {
    type: 'agent:message',
    agentId: 'pa',
    message: `Alright team, let's align on: "${topic.slice(0, 80)}". Quick round — each of you, your key take.`,
    targetId: 'all',
  });

  await new Promise(r => setTimeout(r, 1500));

  // Each specialist contributes
  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  for (const agentId of participants) {
    const agent = this.coreAgents.get(agentId);
    if (!agent) continue;
    try {
      const result = await this.ollamaAdapter.complete({
        model,
        messages: [
          { role: 'system', content: `You are ${agent.config.name}, a ${agent.config.role}. In a board meeting about the topic below, give your professional perspective in exactly 2 sentences. Be direct and specific to your expertise.` },
          { role: 'user', content: `Topic: ${topic}` },
        ],
        temperature: 0.8,
      });
      const contribution = result.content.trim();
      if (contribution) {
        this.broadcast('agent:message', {
          type: 'agent:message',
          agentId,
          message: contribution,
          targetId: 'all',
        });
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch { /* skip if agent fails */ }
  }

  // PA closes
  this.broadcast('agent:message', {
    type: 'agent:message',
    agentId: 'pa',
    message: `Good. We're aligned. Everyone back to your tasks.`,
    targetId: 'all',
  });

  await new Promise(r => setTimeout(r, 1000));

  // End meeting — agents return to desks
  this.broadcast('board:ended', { type: 'board:ended', participants: inMeeting });

  inMeeting.forEach(id => {
    const state = this.state.agents.get(id);
    if (state) state.action = 'work';
    this.broadcast('agent:status', { type: 'agent:status', agentId: id, status: 'working' });
  });

  this.isBoardMeetingActive = false;
}
```

4. In `receiveCeoMessage()`, after building `mentionedAgents[]` and before the `for` loop that calls `runSpecialistTask`, add:
```typescript
if (mentionedAgents.length >= 2 && !this.isBoardMeetingActive) {
  // Run board meeting in background — don't await (non-blocking)
  this.runBoardMeeting(mentionedAgents, content).catch(err =>
    console.error('[BoardMeeting] error:', err)
  );
}
```

**Files:** EDIT `apps/server/src/rooms/OfficeRoom.ts`

**Escalate to Claude if:**
- `isBoardMeetingActive` causes TypeScript errors — declare it as `private isBoardMeetingActive: boolean = false`
- Board meeting conflicts with task execution timing — reduce participant delays to 500ms

---

### T-057 — Server: board room movement precision + WebSocket event contract
**Brain:** Kilo Code | **Status:** READY | **Phase:** 6 | **Depends On:** T-056

**Goal:** Make board meeting movement clean and reliable. Ensure the `board:started` and `board:ended` WebSocket events have the full payload the dashboard 3D scene needs to animate agents moving to their seats.

**Context:**
- Current `furnitureTargets` drives the passive movement in `update()`. During a board meeting, agents must snap to seats (not drift toward them over 5 ticks). After the meeting, they must return to their desks.
- The `board:started` event currently sends `seats` as an array. The dashboard needs to know which agent goes to which seat — send it as a map.

**Steps:**

1. In `runBoardMeeting()`, change the `board:started` broadcast to include a seat assignment map:
```typescript
const seatAssignments: Record<string, { x: number; y: number }> = {};
inMeeting.forEach((id, i) => {
  if (this.boardSeats[i]) seatAssignments[id] = this.boardSeats[i];
});

this.broadcast('board:started', {
  type: 'board:started',
  participants: inMeeting,
  topic,
  seatAssignments,
});
```

2. In the `board:ended` broadcast, include the desk positions agents should return to:
```typescript
const deskReturn: Record<string, { x: number; y: number }> = {};
inMeeting.forEach(id => {
  const deskKey = `${id}-desk`;
  if (this.furnitureTargets[deskKey]) {
    deskReturn[id] = { x: this.furnitureTargets[deskKey].x, y: this.furnitureTargets[deskKey].y };
  }
});
this.broadcast('board:ended', { type: 'board:ended', participants: inMeeting, deskReturn });
```

3. In the `update()` movement loop, skip movement for agents that are `in-meeting`:
```typescript
// In the state.agents.forEach loop, add at the top:
if (agent.action === 'in-meeting') return;
```
This prevents the passive drift loop from fighting the board seat positions.

4. Also add `board:started` and `board:ended` to the WS events list in `OfficeRoom.onCreate()` onMessage section (comment only, for documentation):
```typescript
// WS events emitted by this room:
// agent:status, agent:message, agent:action, agent:hired
// task:created, task:completed
// board:started { participants, topic, seatAssignments }
// board:ended   { participants, deskReturn }
```

**Files:** EDIT `apps/server/src/rooms/OfficeRoom.ts`

**Escalate to Claude if:** `agent.action` type definition doesn't include `'in-meeting'` — check `OfficeState.ts` and add it if missing.

---

## PHASE 7 — Output Quality + BYOK Streaming

---

### T-058 — Server: specialist output quality v2 — better prompts, HTML detection, file extensions
**Brain:** Kilo Code | **Status:** READY | **Phase:** 7 | **Depends On:** T-056

**Goal:** The demo workflow (CEO asks for a landing page) must produce a valid `.html` file, not a `.md` file containing HTML. Specialist outputs must be deliverable-quality — no preamble, no meta-commentary.

**Context:**
- `OfficeRoom.runSpecialistTask()` — `ROLE_PROMPTS` dict defines system prompts. They're good but missing the "no preamble" instruction that LLMs need.
- `toolExecutor.execute('write_file', ...)` — check `ToolExecutor.ts` to see how it derives the filename/extension. It currently always writes `.md` or generic extension.

**Steps:**

1. In `OfficeRoom.runSpecialistTask()`, update `ROLE_PROMPTS`:
```typescript
const ROLE_PROMPTS: Record<string, string> = {
  dev: 'You are Dev, a senior developer. Produce only the deliverable — complete, runnable code with no explanation, no preamble, no markdown fences. If the task is a web page, output valid HTML starting with <!DOCTYPE html>. If the task is a script, output only the script.',
  researcher: 'You are Ray, a researcher. Produce only the deliverable — a complete research brief with headers, key findings, cited specifics, and source URLs where relevant. No preamble.',
  copywriter: 'You are Cleo, a copywriter. Produce only the deliverable — the full copy text. No preamble, no "here is the copy", no meta-commentary. Just the content.',
  analyst: 'You are Max, a market analyst. Produce only the deliverable — a complete analysis with market sizing, competitor landscape, and 3 actionable recommendations. No preamble.',
};
```

2. After `const output = result.content.trim();`, detect file type:
```typescript
const isHTML = output.trimStart().startsWith('<!DOCTYPE') || output.trimStart().startsWith('<html');
const isCode = !isHTML && (
  output.includes('def ') || output.includes('function ') ||
  output.includes('import ') || output.includes('class ')
) && agentId === 'dev';
const ext = isHTML ? 'html' : isCode ? 'js' : 'md';
```

3. Pass `ext` to `write_file`:
```typescript
const toolResult = await this.toolExecutor.execute('write_file', {
  content: output,
  agentId,
  filename: taskTitle.slice(0, 40),
  extension: ext,
});
```

4. Open `apps/server/src/tools/ToolExecutor.ts`. Find the `write_file` handler. Update it to accept an optional `extension` param:
```typescript
const ext = params.extension || 'md';
const safeFilename = (params.filename || 'output')
  .replace(/[^a-zA-Z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .toLowerCase()
  .slice(0, 40);
const filePath = path.join(outputDir, `${safeFilename}.${ext}`);
```

**Files:**
- EDIT `apps/server/src/rooms/OfficeRoom.ts`
- EDIT `apps/server/src/tools/ToolExecutor.ts`

**Escalate to Claude if:** ToolExecutor's write_file handler has a different structure than `params.filename` — read the handler first and adapt.

---

### T-059 — Server: BYOK streaming — OpenAICompatibleAdapter.stream() eliminates single-chunk fallback
**Brain:** Kilo Code | **Status:** READY | **Phase:** 7 | **Depends On:** T-053

**Goal:** When a user has a BYOK key (OpenAI, Groq, etc.), `streamCeoMessage()` currently calls `complete()` and emits the full response as one token. This feels like a 5-10s freeze. Fix it by streaming OpenAI-format SSE.

**Context:**
- `packages/adapters/src/OpenAICompatibleAdapter.ts` — has `complete()`. Add `stream()` that reads OpenAI SSE format (`data: {"choices":[{"delta":{"content":"..."},"finish_reason":null}]}`).
- `OfficeRoom.streamCeoMessage()` — the BYOK branch currently calls `adapter.complete()`. Replace with `adapter.stream()` if available.

**Steps:**

1. Open `packages/adapters/src/OpenAICompatibleAdapter.ts`. Add a `stream()` method:
```typescript
async stream(options: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  onToken: (token: string) => void;
  onDone: () => void;
  temperature?: number;
}): Promise<string> {
  const response = await fetch(`${this.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`BYOK stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') { options.onDone(); continue; }
      try {
        const data = JSON.parse(payload);
        const token = data.choices?.[0]?.delta?.content;
        if (token) { fullText += token; options.onToken(token); }
        if (data.choices?.[0]?.finish_reason === 'stop') options.onDone();
      } catch { /* malformed chunk */ }
    }
  }

  return fullText;
}
```

2. Check `OpenAICompatibleAdapter`'s constructor — it needs to store `apiKey` as an accessible field. If `private apiKey` is already there, use it. If not, update constructor:
```typescript
constructor(private baseUrl: string, private apiKey: string, private provider?: string) {}
```

3. In `OfficeRoom.streamCeoMessage()`, replace the BYOK branch:
```typescript
} else {
  // BYOK — stream if adapter supports it
  const adapter = this.getAdapter(provider, apiKey) as OpenAICompatibleAdapter;
  fullResponse = await adapter.stream({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content },
    ],
    temperature: 0.7,
    onToken: (token) => emit({ type: 'token', agentId: 'pa', token }),
    onDone: () => emit({ type: 'done', agentId: 'pa' }),
  });
}
```

**Files:**
- EDIT `packages/adapters/src/OpenAICompatibleAdapter.ts`
- EDIT `apps/server/src/rooms/OfficeRoom.ts`

**Escalate to Claude if:**
- `OpenAICompatibleAdapter` constructor signature differs — read it first before editing
- Groq or OpenRouter uses a different SSE format — test with a known good key and log the raw SSE lines

---

## PHASE 8 — Launch Infrastructure

---

### T-060 — Infrastructure: Dockerfile validation + .dockerignore
**Brain:** Kilo Code | **Status:** READY | **Phase:** 8 | **Depends On:** T-005

**Goal:** `docker compose up` must boot both services cleanly. Validate the Dockerfiles created in T-005 and add a .dockerignore to prevent node_modules, .env, and output files from being copied into the image.

**Steps:**

1. CREATE `.dockerignore` at the project root:
```
node_modules
**/node_modules
.env
.env.local
**/.env.local
output/
data/
.git
.gitignore
**/*.log
dist/
**/dist/
.next/
**/.next/
*.md
!README.md
```

2. Read `apps/server/Dockerfile` and `apps/dashboard/Dockerfile` (created in T-005). Verify:
   - Server Dockerfile: correct workspace installs, correct build order (types → core → adapters → server)
   - Dashboard Dockerfile: only installs dashboard workspace, runs `next build`
   - Both expose correct ports

3. If server Dockerfile missing `RUN npm run build --workspace=packages/types` before core/adapters — add it. The types package must be built first.

4. Read root `docker-compose.yml`. Verify `depends_on: server` is set for dashboard service.

5. If any Dockerfile has issues, fix them. Log all changes in CHANGELOG.

**Files:** READ + EDIT (if needed) `docker-compose.yml`, `apps/server/Dockerfile`, `apps/dashboard/Dockerfile` | CREATE `.dockerignore`

**Escalate to Claude if:** Monorepo context boundaries require the dashboard Dockerfile to copy packages/ as well — flag the specific COPY step that fails.

---

### T-061 — Infrastructure: GitHub Actions CI — typecheck + build matrix
**Brain:** Kilo Code | **Status:** READY | **Phase:** 8 | **Depends On:** T-060

**Goal:** Every push and PR runs a CI check. Catch type errors and build failures before they reach main. This is required for the GitHub 10k star goal — open source repos without CI are harder to trust.

**Steps:**

1. CREATE `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages/types
        run: npm run build --workspace=packages/types

      - name: Build packages/core
        run: npm run build --workspace=packages/core

      - name: Build packages/adapters
        run: npm run build --workspace=packages/adapters

      - name: Typecheck server
        run: npm run typecheck --workspace=apps/server || npx tsc --noEmit --workspace=apps/server

      - name: Build server
        run: npm run build --workspace=apps/server

      - name: Typecheck dashboard
        run: npm run typecheck --workspace=apps/dashboard || npx tsc --noEmit --project apps/dashboard/tsconfig.json

      - name: Build dashboard
        run: npm run build --workspace=apps/dashboard
        env:
          ADMIN_PASSWORD: ci-placeholder
          AUTH_SECRET: ci-placeholder-32-char-secret-xx
```

2. Verify each workspace has a `build` script in its `package.json`. If `typecheck` script is missing from any package.json, the `|| npx tsc --noEmit` fallback handles it.

3. CREATE `.github/` directory if it doesn't exist (git will track it via the yml file).

**Files:** CREATE `.github/workflows/ci.yml`

**Escalate to Claude if:** Any workspace doesn't have a `build` script — list them, Claude will add the scripts.

---

### T-062 — Infrastructure: README launch polish + CONTRIBUTING.md
**Brain:** Kilo Code | **Status:** READY | **Phase:** 8 | **Depends On:** T-044

**Goal:** README needs to be the launch document — someone landing on this from a GitHub trending page must immediately understand what this is, want to try it, and know how to run it. CONTRIBUTING.md lets others fork and collaborate.

**Context:** README.md was created in T-044. Read it before editing — do not lose any existing content. Only add the sections below.

**Steps:**

1. Read `README.md`. Add the following at the very top (before everything else):

```markdown
<div align="center">

# AI HQ — Run Your Own AI Startup

**You're the CEO. AI agents are your team.**
Local-first, open source, runs on Ollama (free) or BYOK.

[![GitHub stars](https://img.shields.io/github/stars/Landlifespace/AI_Headquarters?style=social)](https://github.com/Landlifespace/AI_Headquarters)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](package.json)

> Demo GIF coming soon

</div>

---
```

2. After the Quick Start section, add a Deploy section:

```markdown
## Deploy in One Click

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/aihq)

Or clone and run locally — see Quick Start above.
```

3. At the bottom, before License, add:

```markdown
## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add agents, tools, and LLM adapters.
```

4. CREATE `CONTRIBUTING.md`:
```markdown
# Contributing to AI HQ

## Dev Setup

```bash
git clone <repo>
npm install
cp .env.example .env   # fill in ADMIN_PASSWORD + AUTH_SECRET
ollama pull llama3.1:8b
npm run dev            # starts server (3001) + dashboard (3000)
```

## Adding a New Agent

1. Open `apps/server/src/rooms/OfficeRoom.ts`
2. Call `setupCoreAgent(id, name, role, deskPosition)` in `onCreate()`
3. Add a desk position in `furnitureTargets`: `'<id>-desk': { x, y, type: 'desk' }`
4. Add the agent to the 3D scene: update `agentsConfig.ts` in `apps/dashboard/src/config/`

## Adding a New Tool

1. Open `apps/server/src/tools/ToolExecutor.ts`
2. Add a new case to the `execute()` switch
3. Declare the tool in the agent capabilities array in `OfficeRoom.ts`

## Adding a New LLM Adapter

1. Create `packages/adapters/src/YourAdapter.ts` implementing `InferenceAdapter` from `@aihq/core`
2. Export it from `packages/adapters/src/index.ts`
3. Add provider URL to `getAdapter()` in `OfficeRoom.ts`

## Architecture

See `CLAUDE.md` for full architecture documentation.

## License

MIT. Attribution required — see README.
```

**Files:** EDIT `README.md` | CREATE `CONTRIBUTING.md`

**Escalate to Claude if:** README has sections in T-044 that conflict with the new header — merge carefully, do not drop attribution section.

---

## PHASE 9 — Verification & Launch

---

### T-063 — Bug fix: restore `output` endpoint in paths.ts
**Brain:** Claude Code | **Status:** DONE | **Phase:** 9 | **Depends On:** T-043

Restored `output: (filePath: string) => \`${SERVER_URL}/api/output?path=${encodeURIComponent(filePath)}\`` to the API export in `apps/dashboard/src/lib/paths.ts`. This was accidentally deleted in the working copy, breaking the output viewer feature (T-043).

---

### T-064 — Verification: TypeScript build across all packages
**Brain:** Kilo Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-062

**Goal:** Confirm zero TypeScript errors across all workspaces. Every package must build clean.

**Steps:**
1. From project root, run:
```bash
npm run build --workspace=packages/types
npm run build --workspace=packages/core
npm run build --workspace=packages/adapters
npm run build --workspace=apps/server
npm run build --workspace=apps/dashboard
```
2. For each error: fix the error in the relevant file. Do NOT suppress with `// @ts-ignore` — fix the root cause.
3. Log all files changed in CHANGELOG.md under a new `## [Unreleased]` entry.

**Output:** All 5 workspace builds exit 0.

**Escalate to Claude if:** Build error requires changing an interface in `packages/types` — that's an API contract change.

---

### T-065 — Verification: remove terminal route + final security sweep
**Brain:** Cline | **Status:** READY | **Phase:** 9 | **Depends On:** T-049

**Goal:** The terminal route at `apps/dashboard/src/app/api/terminal/route.ts` was spec'd to be deleted (v2 feature, security concern). Instead it was "secured" with an allowlist. Claude decision: delete it entirely. Also sweep for any other v2 routes that should be gone.

**Steps:**
1. Delete `apps/dashboard/src/app/api/terminal/route.ts`.
2. Search for any UI component that calls `/api/terminal` — if found, remove the call or hide the component behind a v2 feature flag comment.
3. Search for these routes that should not exist — delete if found:
   - `/api/files` or `/api/file`
   - `/api/search`
   - `/api/memory`
   - `/api/browse`
   - `/api/git`
   - `/api/media`
4. Run `grep -r "terminal" apps/dashboard/src/` — confirm no dead imports.
5. Log to CHANGELOG.md.

**Output:** Terminal route deleted. No v2 route stubs remain.

**Escalate to Claude if:** A UI component visibly relies on the terminal and removal would break rendering.

---

### T-066 — Integration: wire server cost data to dashboard costs page
**Brain:** Kilo Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-054

**Goal:** The dashboard costs page currently reads from a local `usage-tracking.db` via a `collect-usage` script. The server already tracks token usage in its own SQLite DB (T-054). These are two disconnected systems. Wire the dashboard costs page to the server's `/api/costs` endpoint instead.

**Steps:**
1. Read `apps/dashboard/src/app/api/costs/route.ts` — it currently uses `getDatabase`, `getCostSummary` etc from `@/lib/usage-queries`.
2. Replace the GET handler to proxy to `API.costs` (from `@/lib/paths`), same pattern as `tasks/route.ts`.
3. Keep the POST handler (budget update) — it can remain local for now.
4. The server's `/api/costs` returns an array of cost records. Check the shape from `OfficeRoom.getCosts()` in `apps/server/src/rooms/OfficeRoom.ts` — adapt the dashboard costs page component to match this shape if needed.
5. Log to CHANGELOG.md.

**Output:** Costs page shows live server token usage, not stale local DB.

**Escalate to Claude if:** The server cost response shape is incompatible with the Costs page UI — that requires a dashboard component change too.

---

### T-067 — Launch: demo GIF script + recording checklist
**Brain:** Cline | **Status:** READY | **Phase:** 9 | **Depends On:** T-065

**Goal:** Create a step-by-step script for recording the flagship demo GIF (landing page demo workflow under 5 min).

**Steps:**
1. Create `examples/demo-workflows/recording-script.md` with:
   - Pre-flight: Ollama running, llama3.2 pulled, server + dashboard both running, browser at localhost:3000
   - Scene 1: Login, show empty office
   - Scene 2: CEO types the landing page command
   - Scene 3: PA acknowledges, agents activate (show 3D avatars changing status)
   - Scene 4: Board room sequence (if triggered)
   - Scene 5: Task board populates, agents working
   - Scene 6: Tasks complete, PA reports back, output files visible
   - Post-recording: GIF tool recommendations (LICEcap, Kap, ScreenToGif)
2. Add to `README.md` under a `## Demo` section: embed placeholder for the GIF and link to the recording script.

**Output:** `examples/demo-workflows/recording-script.md` created. README has Demo section.

**Escalate to Claude if:** README Demo section would conflict with existing sections — coordinate placement.

---

### T-068 — Launch: GitHub repo push checklist + HN/PH draft
**Brain:** Claude Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-067

**Goal:** Prepare everything needed to push to GitHub and submit to Hacker News + Product Hunt.

**Steps:**
1. Create `docs/launch-checklist.md` with:
   - Pre-push: T-064 (TypeScript clean), T-065 (terminal deleted), T-066 (costs wired), T-067 (demo GIF recorded and in README)
   - GitHub setup: create repo `AI-Headquarter` under `jinujon007`, set description, topics: `ai-agents`, `multi-agent`, `ollama`, `nextjs`, `colyseus`, `local-first`, `3d-office`
   - GitHub: enable Issues, Discussions. Link SECURITY.md. Enable Dependabot alerts.
   - HN post draft (Show HN format)
   - Product Hunt submission checklist
2. Write the HN draft directly in the checklist file.

**Output:** `docs/launch-checklist.md` created.

**Escalate to Claude if:** None — this is documentation only.

---

### T-069 — Server: basic API smoke tests
**Brain:** Kilo Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-064

**Goal:** The CI runs `npm test` but there are no tests. This badge is currently lying. Add minimal integration tests that prove the server API contract is working.

**Steps:**
1. Add `jest` + `@types/jest` + `ts-jest` to `apps/server` devDependencies.
2. Create `apps/server/src/__tests__/api.test.ts`:
   - Test `GET /health` returns `{ ok: true }`
   - Test `GET /api/health` returns JSON with `uptime` field
   - Test `GET /api/agents` returns an array
   - Test `GET /api/tasks` returns an array
   - Test `POST /api/ceo/message` with no body returns 400
   - Test `POST /api/agents/hire` with no body returns 400
3. Add `jest.config.js` to `apps/server/`.
4. Confirm `npm test --workspace=apps/server` passes in CI.

**Output:** 6 passing tests. CI test step no longer silent.

**Escalate to Claude if:** Server requires a running Colyseus room to answer `/api/agents` — may need to mock `OfficeRoom.getActiveRoom()`.

---

### T-070 — Server: fix dev script — add watch mode
**Brain:** Kilo Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-064

**Goal:** `"dev": "tsc -b && node dist/index.js"` builds once and runs compiled output. Code changes require manual restart. This is a broken DX that slows every iteration.

**Steps:**
1. Add `ts-node-dev` to `apps/server` devDependencies: `"ts-node-dev": "^2.0.0"`.
2. Update `apps/server/package.json` dev script:
   ```json
   "dev": "ts-node-dev --respawn --transpile-only --project tsconfig.json src/index.ts"
   ```
3. Verify `npm run dev --workspace=apps/server` starts and restarts on file save.
4. The `build` and `start` scripts remain unchanged (used in Docker/CI).

**Output:** Server restarts automatically on source change during development.

**Escalate to Claude if:** `ts-node-dev` has issues with the `@colyseus/schema` decorators — some schema decorators don't work with transpile-only mode.

---

### T-071 — Infrastructure: Docker Compose healthchecks + startup order
**Brain:** Kilo Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-053

**Goal:** `depends_on: server` in docker-compose.yml only waits for container start, not server readiness. Dashboard starts before Colyseus room is initialized. First-time Docker users see a broken state.

**Steps:**
1. Edit `docker-compose.yml` — add healthcheck to the `server` service:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
     interval: 5s
     timeout: 3s
     retries: 10
     start_period: 15s
   ```
2. Update the `dashboard` service `depends_on`:
   ```yaml
   depends_on:
     server:
       condition: service_healthy
   ```
3. Verify `docker compose up` correctly waits for server health before starting dashboard.

**Output:** Docker cold-start no longer shows a broken dashboard.

**Escalate to Claude if:** Curl is not available in the server Docker image (alpine) — use `wget -q -O - http://localhost:3001/health` instead.

---

### T-072 — Infrastructure: create .releaserc for semantic-release
**Brain:** Claude Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-068

**Goal:** `release.yml` uses semantic-release but there is no `.releaserc` configuration. Without it, semantic-release uses defaults that don't match the monorepo structure. The release workflow will fail or produce incorrect output on first push to main.

**Steps:**
1. Create `.releaserc` at project root:
   ```json
   {
     "branches": ["main"],
     "plugins": [
       "@semantic-release/commit-analyzer",
       "@semantic-release/release-notes-generator",
       ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
       ["@semantic-release/git", {
         "assets": ["CHANGELOG.md", "package.json"],
         "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
       }],
       "@semantic-release/github"
     ]
   }
   ```
2. Add missing semantic-release plugins to root `package.json` devDependencies:
   ```
   @semantic-release/commit-analyzer
   @semantic-release/release-notes-generator
   @semantic-release/github
   ```
3. Update `release.yml` extra_plugins list to include these.

**Output:** `release.yml` will correctly analyze commits, update CHANGELOG.md, create a GitHub release, and tag on push to main.

**Escalate to Claude if:** None — this is configuration only.

---

### T-073 — Cleanup: remove dead code — server db.ts + dashboard /api/office
**Brain:** Cline | **Status:** READY | **Phase:** 9 | **Depends On:** T-065

**Goal:** Two dead code artifacts are creating confusion and maintenance overhead. Remove both.

**Steps:**
1. Delete `apps/server/src/db.ts` — this is the agent-office original DB schema (offices/agents/memories tables). It is never imported. `MemoryStore.ts` is the real persistence layer. Verify with: `grep -r "from.*db" apps/server/src/ | grep -v node_modules`.
2. Delete `apps/dashboard/src/app/api/office/route.ts` — this returns hardcoded static agent stubs. It exists from before the real Colyseus WebSocket integration was built. Check if anything calls this route: `grep -r "api/office" apps/dashboard/src/ | grep -v node_modules`. If called by a component, remove or replace that call with the real `/api/agents` route.
3. Check `apps/dashboard/src/(dashboard)/page.tsx` — the home page calls `/api/activities/stats`. The activities system requires a separate `data/activities.db` that is never populated by normal usage. Add a null/empty state graceful fallback to the home page so it doesn't show broken stats for first-time users.
4. Log all deletions to CHANGELOG.md.

**Output:** Dead code removed. Dashboard home page doesn't show broken zeros.

**Escalate to Claude if:** `/api/office` is referenced by a component that can't easily be rerouted.

---

### T-074 — Security: add rate limiting to /api/ceo/message
**Brain:** Kilo Code | **Status:** READY | **Phase:** 9 | **Depends On:** T-070

**Goal:** `/api/ceo/message` has no rate limiting. A client can flood the server with concurrent requests, queueing up Ollama calls (OOM risk) or burning BYOK API credits. Minimum viable protection: reject if a CEO message is already in-flight.

**Steps:**
1. In `apps/server/src/rooms/OfficeRoom.ts`, add a class-level flag:
   ```typescript
   private ceoMessageInFlight = false;
   ```
2. In `streamCeoMessage()`, add at the start:
   ```typescript
   if (this.ceoMessageInFlight) {
     emit({ type: 'error', message: 'PA is still processing your last message. Please wait.' });
     emit({ type: 'end' });
     return;
   }
   this.ceoMessageInFlight = true;
   ```
3. In the finally block (ensure this runs even on error):
   ```typescript
   this.ceoMessageInFlight = false;
   ```
4. In `apps/server/src/index.ts`, add a simple Express rate limiter on the route: `express-rate-limit` — 10 requests per minute per IP.

**Output:** Concurrent CEO messages are rejected gracefully. IP-based rate limiting prevents abuse.

**Escalate to Claude if:** `express-rate-limit` has a version conflict with existing Express setup.

---

### T-075 — Cleanup: remove @react-three/rapier from dashboard deps
**Brain:** Cline | **Status:** READY | **Phase:** 9 | **Depends On:** T-073

**Goal:** `@react-three/rapier` (physics engine, ~500KB WASM) is in dashboard dependencies but never used in any source file. Remove it to reduce bundle size.

**Steps:**
1. Verify not used: `grep -r "rapier" apps/dashboard/src/ | grep -v node_modules`
2. Remove from `apps/dashboard/package.json` dependencies.
3. Run `npm install` to update lockfile.
4. Run `npm run build --workspace=apps/dashboard` to confirm build still passes.

**Output:** Dashboard bundle reduced. No functional change.

**Escalate to Claude if:** Build output references rapier after removal (would mean it'
