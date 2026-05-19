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
  deskPosition: [number, number, number];
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
  assignedTo: string;
  createdBy: string;
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
