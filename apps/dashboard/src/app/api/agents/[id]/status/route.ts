import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENTS: Record<string, { name: string; model: string }> = {
  pa:         { name: process.env.NEXT_PUBLIC_AGENT_NAME || "Alex", model: "ollama/llama3.2" },
  dev:        { name: "Dev",  model: "ollama/llama3.2" },
  researcher: { name: "Ray",  model: "ollama/llama3.2" },
  copywriter: { name: "Cleo", model: "ollama/llama3.2" },
  analyst:    { name: "Max",  model: "ollama/llama3.2" },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = AGENTS[id];

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    agent: {
      id,
      name: agent.name,
      model: agent.model,
      workspace: "output/",
      allowAgents: id === "pa" ? ["dev", "researcher", "copywriter", "analyst"] : [],
    },
    memory: { recentFiles: [] },
    sessions: [],
  });
}
