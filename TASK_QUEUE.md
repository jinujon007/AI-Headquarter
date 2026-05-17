# TASK_QUEUE.md — AI_Headquarters

Single source of truth for what to build. Kilo Code and Cline read this before touching anything.

**Rules:**
- Mark IN-PROGRESS before starting any task
- One task at a time per brain
- Log to CHANGELOG.md when done
- Never make architecture decisions — escalate to Claude via Jinu

---

## INDEX

| ID | Title | Brain | Status | Phase | Depends On |
|----|-------|-------|--------|-------|------------|
| T-001 | Create monorepo root structure | Kilo Code | READY | 0 | Manual steps done |
| T-002 | Copy agent-office packages into monorepo | Kilo Code | BLOCKED | 0 | T-001 |
| T-003 | Copy tenacitOS into apps/dashboard | Kilo Code | BLOCKED | 0 | T-001 |
| T-004 | Create root tsconfig.base.json | Kilo Code | BLOCKED | 0 | T-001 |
| T-005 | Create root docker-compose.yml skeleton | Kilo Code | BLOCKED | 0 | T-002, T-003 |
| T-006 | Create .env.example | Kilo Code | BLOCKED | 0 | T-005 |
| T-007 | Create packages/types shared contract | Kilo Code | BLOCKED | 0 | T-002 |
| T-008 | Audit: list all OpenClaw imports in dashboard | Cline | BLOCKED | 0 | T-003 |

---

## DETAIL SPECS

---

### T-001 — Create monorepo root structure
**Brain:** Kilo Code
**Status:** READY
**Phase:** 0
**Depends On:** Jinu must complete Manual Setup Steps below first

**Goal:** Scaffold the AI_Headquarters monorepo folder structure and root package.json with npm workspaces configured.

**Steps:**
1. Create folder structure:
```
apps/
  dashboard/       (empty for now)
  server/          (empty for now)
packages/
  core/            (empty for now)
  adapters/        (empty for now)
  types/           (empty for now)
output/            (where agent output files land)
temp-agent-office/ (already exists from clone)
temp-tenacitOS/    (already exists from clone)
```
2. Create root `package.json`:
```json
{
  "name": "ai-headquarters",
  "version": "0.0.1",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=apps/dashboard\" \"npm run dev --workspace=apps/server\"",
    "build": "npm run build --workspaces",
    "start": "concurrently \"npm run start --workspace=apps/dashboard\" \"npm run start --workspace=apps/server\""
  },
  "devDependencies": {
    "concurrently": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```
3. Create root `.gitignore`:
```
node_modules/
.next/
dist/
*.env.local
.env
temp-agent-office/
temp-tenacitOS/
output/
```
4. Run `npm install` at root level.

**Output:**
- CREATED: `package.json`
- CREATED: `.gitignore`
- CREATED: folder structure above
- MODIFIED: nothing else

**Escalate to Claude if:** npm workspaces setup produces unexpected errors related to package resolution.

---

### T-002 — Copy agent-office packages into monorepo
**Brain:** Kilo Code
**Status:** BLOCKED
**Phase:** 0
**Depends On:** T-001

**Goal:** Copy the relevant agent-office packages from `temp-agent-office/` into the monorepo `packages/` and `apps/server/`.

**Steps:**
1. Copy `temp-agent-office/packages/core/` → `packages/core/`
2. Copy `temp-agent-office/packages/adapters/` → `packages/adapters/`
3. Copy `temp-agent-office/packages/server/` → `apps/server/`
4. Copy `temp-agent-office/packages/cli/` → ignore (not needed)
5. In each copied package, update `package.json` name field:
   - `@agent-office/core` → `@aihq/core`
   - `@agent-office/adapters` → `@aihq/adapters`
   - `@agent-office/server` → `@aihq/server`
6. In each copied package, update all internal imports from `@agent-office/` → `@aihq/`
7. Run `npm install` at root level.

**Output:**
- CREATED: `packages/core/` (all files from agent-office)
- CREATED: `packages/adapters/` (all files from agent-office)
- CREATED: `apps/server/` (all files from agent-office packages/server)

**Escalate to Claude if:** Import resolution breaks after renaming. Do not fix import errors by guessing — escalate.

---

### T-003 — Copy tenacitOS into apps/dashboard
**Brain:** Kilo Code
**Status:** BLOCKED
**Phase:** 0
**Depends On:** T-001

**Goal:** Copy tenacitOS source into `apps/dashboard/` and update package name.

**Steps:**
1. Copy ALL files from `temp-tenacitOS/` → `apps/dashboard/`
   (except: `.git/`, `node_modules/`, `.next/`)
2. In `apps/dashboard/package.json`, update name: `"tenacitos"` → `"@aihq/dashboard"`
3. Run `npm install` from `apps/dashboard/`
4. Verify `npm run build` runs (it will fail on missing env vars — that is acceptable at this stage, note the errors in CHANGELOG)

**Output:**
- CREATED: `apps/dashboard/` (all tenacitOS files)

**Escalate to Claude if:** Build fails with TypeScript errors (not env var errors). List the errors and escalate — do not fix them yet.

---

### T-004 — Create root tsconfig.base.json
**Brain:** Kilo Code
**Status:** BLOCKED
**Phase:** 0
**Depends On:** T-001

**Goal:** Create a shared TypeScript config that all packages extend.

**Steps:**
1. Create `tsconfig.base.json` at root:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```
2. Verify `packages/core/tsconfig.json` extends it: `"extends": "../../tsconfig.base.json"`
3. Verify `packages/adapters/tsconfig.json` extends it.
4. Verify `apps/server/tsconfig.json` extends it.
5. Do NOT touch `apps/dashboard/tsconfig.json` — Next.js manages its own.

**Output:**
- CREATED: `tsconfig.base.json`
- MODIFIED: `packages/core/tsconfig.json` (extend line)
- MODIFIED: `packages/adapters/tsconfig.json` (extend line)
- MODIFIED: `apps/server/tsconfig.json` (extend line)

**Escalate to Claude if:** module resolution strategy conflicts between packages.

---

### T-005 — Create root docker-compose.yml skeleton
**Brain:** Kilo Code
**Status:** BLOCKED
**Phase:** 0
**Depends On:** T-002, T-003

**Goal:** One `docker compose up` boots the server and dashboard together.

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
2. Create `apps/server/Dockerfile` (basic Node.js Dockerfile):
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/server ./apps/server
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci --workspace=apps/server --workspace=packages/core --workspace=packages/adapters --workspace=packages/types
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

**Output:**
- CREATED: `docker-compose.yml`
- CREATED: `apps/server/Dockerfile`
- CREATED: `apps/dashboard/Dockerfile`

**Escalate to Claude if:** Dockerfiles require context that crosses package boundaries in unexpected ways.

---

### T-006 — Create .env.example
**Brain:** Kilo Code
**Status:** BLOCKED
**Phase:** 0
**Depends On:** T-005

**Goal:** Single .env.example at root covering all required environment variables for both apps.

**Steps:**
1. Create `.env.example` at root:
```env
# ─── Auth (required) ────────────────────────────────────────────────
# Password to log into the AIHQ dashboard
ADMIN_PASSWORD=change-me-strong-password

# Random secret for auth cookie — generate: openssl rand -base64 32
AUTH_SECRET=change-me-random-32-char-secret

# ─── LLM — Default: Ollama (local, free) ────────────────────────────
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ─── LLM — BYOK (bring your own key, optional) ───────────────────────
# Uncomment whichever you want to use
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# OPENROUTER_API_KEY=sk-or-...
# GROQ_API_KEY=gsk_...
# GEMINI_API_KEY=...

# ─── Server ──────────────────────────────────────────────────────────
SERVER_PORT=3001
SERVER_URL=http://localhost:3001

# ─── Dashboard ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_TITLE=AI HQ
NEXT_PUBLIC_COMPANY_NAME=AI HEADQUARTERS
NEXT_PUBLIC_OWNER_USERNAME=your-username

# ─── Branding (optional) ─────────────────────────────────────────────
NEXT_PUBLIC_AGENT_NAME=Alex
NEXT_PUBLIC_AGENT_EMOJI=🤖
NEXT_PUBLIC_AGENT_DESCRIPTION=Your AI Chief of Staff, powered by AI HQ
```
2. Create `apps/dashboard/.env.local.example` pointing to root .env.example with note.

**Output:**
- CREATED: `.env.example`
- CREATED: `apps/dashboard/.env.local.example`

**Escalate to Claude if:** new env vars are discovered that are not listed here — add them here, don't hard-code.

---

### T-007 — Create packages/types shared contract
**Brain:** Kilo Code
**Status:** BLOCKED
**Phase:** 0
**Depends On:** T-002

**Goal:** Create the shared TypeScript types package that defines the API contract between dashboard and server. This is the single source of truth for all data shapes crossing the boundary.

**Steps:**
1. Create `packages/types/package.json`:
```json
{
  "name": "@aihq/types",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```
2. Create `packages/types/src/index.ts` with these types:
```typescript
// Agent types
export type AgentStatus = 'idle' | 'thinking' | 'working' | 'talking' | 'in-meeting';
export type AgentRole = 'pa' | 'developer' | 'researcher' | 'copywriter' | 'analyst' | 'custom';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  model: string;
  provider: 'ollama' | 'claude' | 'openai' | 'openrouter' | 'groq' | 'gemini';
  deskPosition: [number, number, number]; // x, y, z in 3D office
  currentTask?: string;
  mood?: string;
  tokenUsage?: { input: number; output: number; total: number };
}

// Task types
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'failed';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // agent id
  createdBy: string;  // agent id or 'ceo'
  status: TaskStatus;
  output?: { type: 'file' | 'text'; path?: string; content?: string };
  createdAt: string;
  completedAt?: string;
}

// CEO message
export interface CeoMessage {
  content: string;
  timestamp: string;
}

// Colyseus WebSocket event types
export type OfficeEvent =
  | { type: 'agent:move'; agentId: string; position: [number, number, number] }
  | { type: 'agent:status'; agentId: string; status: AgentStatus }
  | { type: 'agent:message'; agentId: string; message: string; targetId?: string }
  | { type: 'agent:action'; agentId: string; action: string; detail: string }
  | { type: 'agent:hired'; agent: Agent }
  | { type: 'board:started'; agentIds: string[] }
  | { type: 'board:ended' }
  | { type: 'task:created'; task: Task }
  | { type: 'task:completed'; taskId: string; output?: Task['output'] };

// Cost/usage
export interface SessionCost {
  sessionId: string;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  startedAt: string;
  endedAt?: string;
}
```
3. Create `packages/types/tsconfig.json` extending root tsconfig.
4. Run `npm run build --workspace=packages/types`.

**Output:**
- CREATED: `packages/types/package.json`
- CREATED: `packages/types/src/index.ts`
- CREATED: `packages/types/tsconfig.json`

**Escalate to Claude if:** Any type here conflicts with what agent-office's Colyseus schema actually outputs. List the conflict and stop.

---

### T-008 — Audit: list all OpenClaw imports in dashboard
**Brain:** Cline
**Status:** BLOCKED
**Phase:** 0
**Depends On:** T-003

**Goal:** Do NOT change any code. Only identify and list every file in `apps/dashboard/` that imports from or references OpenClaw. Output a clean list to a file.

**Steps:**
1. Search `apps/dashboard/src/` for all occurrences of:
   - `openclaw`
   - `OPENCLAW`
   - `openclaw.json`
   - `/workspace/`
   - `workspace-studio`
   - `mission-control`
2. For each match, record: file path, line number, what it does
3. Write the full list to `(CAI)openclaw-audit.md` at project root
4. Do NOT modify any source files

**Output:**
- CREATED: `(CAI)openclaw-audit.md`

**Escalate to Claude if:** You find more than 20 distinct files with OpenClaw references (likely means deeper integration than expected — Claude needs to re-plan Phase 1).
