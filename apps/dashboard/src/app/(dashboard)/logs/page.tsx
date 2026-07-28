"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, Play, Square, Trash2, Download, Circle } from "lucide-react";

interface LogLine {
  ts: string;
  level: string;
  line: string;
}

function getLineColor(level: string, line: string): string {
  if (level === "error") return "#f87171";
  if (level === "warn") return "#fbbf24";
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("exception")) return "#f87171";
  if (lower.includes("warn")) return "#fbbf24";
  if (lower.includes("ready") || lower.includes("initialized") || lower.includes("✓")) return "#4ade80";
  return "#c9d1d9";
}

// Server log viewer — polls the server's in-memory ring buffer (last 500 lines)
// every 2 seconds. No pm2/systemd assumptions; works on every install.
export default function LogsPage() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [polling, setPolling] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!polling) return;
    let alive = true;
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/logs");
        if (res.ok && alive) {
          const data = await res.json();
          if (Array.isArray(data)) setLines(data);
        }
      } catch { /* server offline — keep last known lines */ }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => { alive = false; clearInterval(interval); };
  }, [polling]);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const handleDownload = () => {
    const text = lines.map((l) => `[${l.ts}] [${l.level}] ${l.line}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aihq-server-logs.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLines = filter
    ? lines.filter((l) => l.line.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0" }}>
      {/* Header */}
      <div style={{ padding: "1.5rem 1.5rem 1rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          Server Logs
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Last 500 console lines from the agent server, refreshed every 2s
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center",
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card)",
      }}>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "0.375rem 0.75rem",
              backgroundColor: "var(--card-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              outline: "none",
              width: "12rem",
            }}
          />

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll"
            style={{
              padding: "0.375rem 0.625rem", borderRadius: "0.5rem", fontSize: "0.75rem",
              backgroundColor: autoScroll ? "rgba(74,222,128,0.1)" : "var(--card-elevated)",
              color: autoScroll ? "#4ade80" : "var(--text-muted)",
              border: "1px solid", borderColor: autoScroll ? "rgba(74,222,128,0.3)" : "var(--border)",
              cursor: "pointer",
            }}
          >
            ↓ Auto
          </button>

          <button onClick={handleDownload} title="Download logs"
            style={{ padding: "0.375rem 0.625rem", borderRadius: "0.5rem", background: "var(--card-elevated)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-muted)" }}>
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setPolling(!polling)}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: polling ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)",
              color: polling ? "#f87171" : "#4ade80",
              border: "1px solid",
              borderColor: polling ? "rgba(239,68,68,0.3)" : "rgba(74,222,128,0.3)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            {polling ? (<><Square className="w-3.5 h-3.5" />Pause</>) : (<><Play className="w-3.5 h-3.5" />Resume</>)}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.375rem 1.5rem",
        backgroundColor: "#0d1117",
        borderBottom: "1px solid #30363d",
        fontSize: "0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Circle
            className="w-2 h-2"
            style={{ fill: polling ? "#4ade80" : "#6b7280", color: polling ? "#4ade80" : "#6b7280" }}
          />
          <span style={{ color: polling ? "#4ade80" : "#6b7280" }}>
            {polling ? "LIVE" : "PAUSED"}
          </span>
        </div>
        <span style={{ color: "#8b949e" }}>aihq-server · ring buffer</span>
        <span style={{ color: "#8b949e", marginLeft: "auto" }}>
          {filteredLines.length} lines{filter && ` (filtered from ${lines.length})`}
        </span>
      </div>

      {/* Log output */}
      <div
        ref={logRef}
        onScroll={() => {
          if (logRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logRef.current;
            setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
          }
        }}
        style={{
          flex: 1,
          overflow: "auto",
          backgroundColor: "#0d1117",
          padding: "1rem 1.5rem",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          lineHeight: 1.6,
        }}
      >
        {filteredLines.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#8b949e" }}>
            <Terminal className="w-12 h-12 mb-3 opacity-30" />
            <p>{polling ? "No log lines yet — is the server running?" : "Polling paused"}</p>
          </div>
        ) : (
          filteredLines.map((l, i) => (
            <div key={`${l.ts}-${i}`} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <span style={{ color: "#484f58", flexShrink: 0, fontSize: "0.7rem", paddingTop: "0.1rem" }}>
                {new Date(l.ts).toLocaleTimeString()}
              </span>
              <span style={{ color: getLineColor(l.level, l.line), wordBreak: "break-all" }}>
                {l.line}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
