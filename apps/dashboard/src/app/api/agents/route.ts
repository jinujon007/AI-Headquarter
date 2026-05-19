import { NextResponse } from "next/server";
import { API } from "@/lib/paths";

export const dynamic = "force-dynamic";

// Fallback when server is offline
const BUILTIN_AGENTS = [
  {
    id: "pa",
    name: process.env.NEXT_PUBLIC_AGENT_NAME || "Alex",
    emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || "🤖",
    color: "#FFCC00",
    model: "ollama/llama3.2",
    workspace: "output/",
    role: "PA / Orchestrator",
    status: "offline" as const,
    activeSessions: 0,
    allowAgents: ["dev", "researcher", "copywriter", "analyst"],
  },
  {
    id: "dev",
    name: "Dev",
    emoji: "💻",
    color: "#4CAF50",
    model: "ollama/llama3.2",
    workspace: "output/",
    role: "Developer",
    status: "offline" as const,
    activeSessions: 0,
    allowAgents: [],
  },
  {
    id: "researcher",
    name: "Ray",
    emoji: "🔍",
    color: "#E91E63",
    model: "ollama/llama3.2",
    workspace: "output/",
    role: "Researcher",
    status: "offline" as const,
    activeSessions: 0,
    allowAgents: [],
  },
  {
    id: "copywriter",
    name: "Cleo",
    emoji: "✍️",
    color: "#0077B5",
    model: "ollama/llama3.2",
    workspace: "output/",
    role: "Copywriter",
    status: "offline" as const,
    activeSessions: 0,
    allowAgents: [],
  },
  {
    id: "analyst",
    name: "Max",
    emoji: "📊",
    color: "#9C27B0",
    model: "ollama/llama3.2",
    workspace: "output/",
    role: "Market Analyst",
    status: "offline" as const,
    activeSessions: 0,
    allowAgents: [],
  },
];

export async function GET() {
  try {
    const res = await fetch(API.agents, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    // Server returns Agent[] — wrap for dashboard compatibility
    const agents = Array.isArray(data) ? data : (data.agents || BUILTIN_AGENTS);
    return NextResponse.json({ agents });
  } catch {
    return NextResponse.json({ agents: BUILTIN_AGENTS });
  }
}
