export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  position: [number, number, number]; // x, y, z
  color: string;
  role: string;
}

export const AGENTS: AgentConfig[] = [
  {
    id: "pa",
    name: process.env.NEXT_PUBLIC_AGENT_NAME || "Alex",
    emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || "🤖",
    position: [0, 0, 0],
    color: "#FFCC00",
    role: "PA / Orchestrator",
  },
  {
    id: "dev",
    name: "Dev",
    emoji: "💻",
    position: [-4, 0, -3],
    color: "#4CAF50",
    role: "Developer",
  },
  {
    id: "researcher",
    name: "Ray",
    emoji: "🔍",
    position: [4, 0, -3],
    color: "#E91E63",
    role: "Researcher",
  },
  {
    id: "copywriter",
    name: "Cleo",
    emoji: "✍️",
    position: [-4, 0, 3],
    color: "#0077B5",
    role: "Copywriter",
  },
  {
    id: "analyst",
    name: "Max",
    emoji: "📊",
    position: [4, 0, 3],
    color: "#9C27B0",
    role: "Market Analyst",
  },
];

export const CEO_ZONE: [number, number, number] = [-6, 0, -5];
export const BOARD_ROOM_ZONE: [number, number, number] = [6, 0, -5];

export type AgentStatus = "idle" | "working" | "thinking" | "talking" | "in-meeting" | "error";

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  model?: string;
  tokensPerHour?: number;
  tasksInQueue?: number;
  uptime?: number;
}
