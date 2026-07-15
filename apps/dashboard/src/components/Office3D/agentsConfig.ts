import type { AgentStatus as WireAgentStatus } from "@aihq/types";

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

// Desk slots for dynamically hired agents. The server's HIRE_DESK_POSITIONS are in
// the legacy agent-office coordinate space and land outside this room, so we map
// hire slot index → an in-room position instead of using the raw server coords.
export const HIRE_DESK_POSITIONS: Array<[number, number, number]> = [
  [-4, 0, 6], [0, 0, 6], [4, 0, 6],
  [-2, 0, -6], [2, 0, -6], [-6, 0, 1],
];

// Colors cycled for hired agents (core agents define their own above)
export const HIRE_COLORS = ["#FF9500", "#00C7BE", "#FF2D55", "#5856D6", "#34C759", "#32ADE6"];

// Wire statuses the server actually broadcasts (see @aihq/types) plus client-only states
export type AgentStatus = WireAgentStatus | "talking" | "error";

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  model?: string;
  tokensPerHour?: number;
  tasksInQueue?: number;
  uptime?: number;
}
