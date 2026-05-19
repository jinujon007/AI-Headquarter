"use client";

import { useEffect, useState } from "react";
import { Bot, Circle, Shield, Users, Plus } from "lucide-react";

type AgentStatus = "idle" | "thinking" | "working" | "talking" | "in-meeting" | "online" | "offline";

interface Agent {
  id: string;
  name: string;
  role?: string;
  model?: string;
  provider?: string;
  status?: AgentStatus;
  currentTask?: string;
  deskPosition?: [number, number, number];
}

const AGENT_META: Record<string, { emoji: string; color: string }> = {
  pa: { emoji: "🤖", color: "#FFCC00" },
  dev: { emoji: "💻", color: "#4CAF50" },
  researcher: { emoji: "🔍", color: "#E91E63" },
  copywriter: { emoji: "✍️", color: "#0077B5" },
  analyst: { emoji: "📊", color: "#9C27B0" },
};

const statusColor = (status?: AgentStatus) => {
  switch (status) {
    case "thinking": return "#facc15";
    case "working": return "#4ade80";
    case "talking": return "#60a5fa";
    case "in-meeting": return "#a78bfa";
    case "online": return "#4ade80";
    default: return "#6b7280";
  }
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireName, setHireName] = useState("");
  const [hireRole, setHireRole] = useState("");
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/agents", { cache: "no-store" });
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : (data?.agents || []));
      } finally {
        setLoading(false);
      }
    };

    run();
    const id = setInterval(run, 5000);
    return () => clearInterval(id);
  }, []);

  const handleHire = async () => {
    if (!hireName.trim() || !hireRole.trim()) {
      setHireError("Name and role are required");
      return;
    }
    setHiring(true);
    setHireError("");
    try {
      const res = await fetch("/api/agents/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: hireName.trim(), role: hireRole.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setAgents(prev => [...prev, {
          id: data.agent.id,
          name: data.agent.name,
          role: data.agent.role,
          status: "idle",
        }]);
        setShowHireModal(false);
        setHireName("");
        setHireRole("");
      } else {
        setHireError(data.error || "Failed to hire agent");
      }
    } catch {
      setHireError("Server unreachable");
    } finally {
      setHiring(false);
    }
  };

  const openHireModal = () => {
    setHireName("");
    setHireRole("");
    setHireError("");
    setShowHireModal(true);
  };

  if (loading) return <div className="p-6">Loading agents...</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          <Users className="inline-block w-8 h-8 mr-2 mb-1" />Agents
        </h1>
        <button
          onClick={openHireModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}
        >
          <Plus className="w-4 h-4" />Hire Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => {
          const meta = AGENT_META[agent.id] || { emoji: "🤖", color: "#64748b" };
          const st = agent.status || "idle";
          return (
            <div key={agent.id} className="rounded-xl border p-5 transition-all hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: `${meta.color}20`, border: `2px solid ${meta.color}` }}>{meta.emoji}</div>
                  <div>
                    <div className="font-bold" style={{ color: "var(--text-primary)" }}>{agent.name}</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: statusColor(st) }}>
                      <Circle className="w-2 h-2" style={{ fill: statusColor(st) }} />{st}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Bot className="w-4 h-4" style={{ color: meta.color }} />{agent.model || "unknown"}</div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: meta.color }} />{agent.provider || "ollama"}</div>
                <div style={{ color: "var(--text-secondary)" }}>{agent.role || "Specialist"}</div>
                {agent.currentTask ? <div className="text-xs" style={{ color: "var(--text-muted)" }}>Task: {agent.currentTask}</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hire Modal */}
      {showHireModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowHireModal(false)}>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Hire New Agent</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input
                  type="text"
                  value={hireName}
                  onChange={e => setHireName(e.target.value)}
                  placeholder="e.g., Charlie"
                  className="w-full px-3 py-2 rounded border"
                  style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  disabled={hiring}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Role</label>
                <input
                  type="text"
                  value={hireRole}
                  onChange={e => setHireRole(e.target.value)}
                  placeholder="e.g., Designer"
                  className="w-full px-3 py-2 rounded border"
                  style={{ backgroundColor: "var(--card-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  disabled={hiring}
                />
              </div>
              {hireError && <div className="text-sm" style={{ color: "var(--error)" }}>{hireError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowHireModal(false)}
                  className="px-4 py-2 rounded border"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  disabled={hiring}
                >
                  Cancel
                </button>
                <button
                  onClick={handleHire}
                  className="px-4 py-2 rounded font-medium"
                  style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}
                  disabled={hiring}
                >
                  {hiring ? "Hiring..." : "Hire"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
