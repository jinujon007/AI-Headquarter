import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Returns agent states for the 3D office view
// Replaced by real Colyseus WebSocket events in Phase 1
const OFFICE_AGENTS = [
  { id: "pa",         name: process.env.NEXT_PUBLIC_AGENT_NAME || "Alex", emoji: "🤖", color: "#FFCC00", role: "PA / Orchestrator", currentTask: "Waiting for CEO command", isActive: false },
  { id: "dev",        name: "Dev",  emoji: "💻", color: "#4CAF50", role: "Developer",      currentTask: "Idle", isActive: false },
  { id: "researcher", name: "Ray",  emoji: "🔍", color: "#E91E63", role: "Researcher",     currentTask: "Idle", isActive: false },
  { id: "copywriter", name: "Cleo", emoji: "✍️", color: "#0077B5", role: "Copywriter",     currentTask: "Idle", isActive: false },
  { id: "analyst",    name: "Max",  emoji: "📊", color: "#9C27B0", role: "Market Analyst", currentTask: "Idle", isActive: false },
];

export async function GET() {
  return NextResponse.json({ agents: OFFICE_AGENTS });
}
