// Wire contract between apps/server (Colyseus broadcasts + REST) and apps/dashboard.
// These types mirror what OfficeRoom.ts / index.ts ACTUALLY emit — if you change a
// payload on the server, update it here so both sides fail typecheck together.

// ─── Agents ──────────────────────────────────────────────────────────────────

/**
 * Statuses the server actually broadcasts on `agent:status`:
 * explicit statuses ('idle' | 'thinking' | 'working' | 'in-meeting'), plus raw
 * schema/decision action values ('work' | 'talk' | 'move' | 'use_tool') that
 * leak through from the agent state machine. Consumers must tolerate all of them.
 */
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'work'
  | 'talk'
  | 'move'
  | 'use_tool'
  | 'in-meeting';

/** GET /api/agents item and `agents-sync` payload (OfficeRoom.getAgentList). */
export interface AgentSummary {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  model: string;
  /** 'ollama' by default; BYOK providers arrive as raw x-llm-provider header strings. */
  provider: string;
  deskPosition: [number, number, number];
  currentTask?: string;
}

// ─── Tasks (REST) ─────────────────────────────────────────────────────────────

/** Task status values stored in SQLite (tasks.status). */
export type TaskRecordStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/** GET /api/tasks row — SELECT * FROM tasks, snake_case straight from SQLite. */
export interface TaskRecord {
  id: number;
  title: string;
  assigned_to: string | null;
  status: TaskRecordStatus;
  output_path: string | null;
  created_at: string;
  completed_at: string | null;
}

// ─── Costs (REST) ─────────────────────────────────────────────────────────────

/** GET /api/costs (MemoryStore.getCostsData). */
export interface CostsData {
  today: number;
  yesterday: number;
  thisMonth: number;
  lastMonth: number;
  projected: number;
  budget: number;
  byAgent: Array<{ agent: string; cost: number; tokens: number }>;
  byModel: Array<{ model: string; cost: number; tokens: number }>;
  daily: Array<{ date: string; cost: number; input: number; output: number }>;
  /** Not implemented yet — always []. */
  hourly: unknown[];
}

// ─── CEO message stream (SSE from POST /api/ceo/message) ────────────────────

export type CeoStreamEvent =
  | { type: 'token'; agentId: string; token: string }
  | { type: 'done'; agentId: string }
  | { type: 'error'; message: string }
  | { type: 'end' };

// ─── WebSocket events (Colyseus broadcasts) ──────────────────────────────────

export interface AgentStatusPayload {
  type: 'agent:status';
  agentId: string;
  status: AgentStatus;
}

export interface AgentMessagePayload {
  type: 'agent:message';
  agentId: string;
  message: string;
  /** 'ceo' | 'pa' | 'all' | an agent id. */
  targetId?: string;
  /** true on PA completion reports delivered to the CEO. */
  isReport?: boolean;
}

export interface AgentActionPayload {
  type: 'agent:action';
  agentId: string;
  /** Tool name, e.g. 'web_search' or 'write_file'. */
  action: string;
  detail: string;
}

/** Nested `agent` object on agent:hired — NOT the same shape as AgentSummary. */
export interface HiredAgent {
  id: string;
  name: string;
  role: string;
  status: 'idle';
  provider: string;
  deskPosition: [number, number, number];
}

export interface AgentHiredPayload {
  type: 'agent:hired';
  agent: HiredAgent;
}

export interface BoardStartedPayload {
  type: 'board:started';
  participants: string[];
  topic: string;
  seatAssignments: Record<string, { x: number; y: number }>;
}

export interface BoardEndedPayload {
  type: 'board:ended';
  participants: string[];
  deskReturn: Record<string, { x: number; y: number }>;
}

/** Task shapes carried on task:* events — camelCase with `task_`-prefixed string ids
 *  (NOT the REST TaskRecord shape). */
export interface TaskCreatedPayload {
  type: 'task:created';
  task: {
    id: string;
    title: string;
    assignedTo: string;
    status: 'in-progress';
    createdAt: string;
  };
}

export interface TaskCompletedPayload {
  type: 'task:completed';
  task: {
    id: string;
    title: string;
    assignedTo: string;
    status: 'completed';
    outputPath: string | null;
    completedAt: string;
  };
}

export interface TaskFailedPayload {
  type: 'task:failed';
  task: {
    id: string;
    title: string;
    assignedTo: string;
    status: 'failed';
    error: string;
  };
}

/** Event name → payload map for every Colyseus broadcast the server emits. */
export interface OfficeEventMap {
  'agent:status': AgentStatusPayload;
  'agent:message': AgentMessagePayload;
  'agent:action': AgentActionPayload;
  'agent:hired': AgentHiredPayload;
  'board:started': BoardStartedPayload;
  'board:ended': BoardEndedPayload;
  'task:created': TaskCreatedPayload;
  'task:completed': TaskCompletedPayload;
  'task:failed': TaskFailedPayload;
}

export type OfficeEvent = OfficeEventMap[keyof OfficeEventMap];
