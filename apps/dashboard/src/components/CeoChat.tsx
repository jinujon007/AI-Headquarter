"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, MessageSquare, Loader2 } from "lucide-react";
import type { AgentMessageEvent } from "@/hooks/use-office-ws";

const CHAT_STORAGE_KEY = "aihq:ceo-chat-history";
const MAX_HISTORY = 100;

const PROVIDER_KEYS: Record<string, { key: string; label: string }> = {
  anthropic:  { key: "apiKey_anthropic",  label: "Claude"     },
  openai:     { key: "apiKey_openai",     label: "OpenAI"     },
  openrouter: { key: "apiKey_openrouter", label: "OpenRouter" },
  groq:       { key: "apiKey_groq",       label: "Groq"       },
  gemini:     { key: "apiKey_gemini",     label: "Gemini"     },
};

interface CeoChatProps {
  messages: AgentMessageEvent[];
  onClose?: () => void;
}

type ChatMessage = {
  role: "ceo" | "agent";
  text: string;
  agentId?: string;
  ts: number;
  id: string;
  streaming?: boolean;
  isReport?: boolean;
};

export function CeoChat({ messages, onClose }: CeoChatProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [activeProvider, setActiveProvider] = useState<{ name: string; label: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load persisted chat and detect active BYOK provider on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLocalMessages(parsed.slice(-MAX_HISTORY));
      }
    } catch { /* ignore */ }

    // P-03: detect active provider
    for (const [provider, config] of Object.entries(PROVIDER_KEYS)) {
      if (localStorage.getItem(config.key)) {
        setActiveProvider({ name: provider, label: config.label });
        break;
      }
    }
  }, []);

  // Merge WS agent messages into local view.
  // Skip non-report PA messages — those arrive via SSE and are already in the streaming bubble.
  // Only merge: (1) isReport=true PA completions, (2) non-PA agent messages.
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[0];
    if (latest.agentId === "pa" && !latest.isReport) return;
    setLocalMessages((prev) => {
      const alreadyExists = prev.some((m) => m.role === "agent" && m.ts === latest.timestamp);
      if (alreadyExists) return prev;
      return [
        ...prev,
        {
          role: "agent",
          text: latest.message,
          agentId: latest.agentId,
          ts: latest.timestamp,
          id: `msg_${latest.timestamp}`,
          isReport: latest.isReport,
        },
      ];
    });
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, sending]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(localMessages.slice(-MAX_HISTORY)));
    } catch { /* ignore */ }
  }, [localMessages]);

  const getBYOKHeaders = () => {
    const headers: Record<string, string> = {};
    for (const [provider, config] of Object.entries(PROVIDER_KEYS)) {
      const apiKey = localStorage.getItem(config.key);
      if (apiKey) {
        headers["x-llm-provider"] = provider;
        headers["x-api-key"] = apiKey;
        break;
      }
    }
    return headers;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    const ts = Date.now();
    setLocalMessages((prev) => [...prev, { role: "ceo", text, ts, id: `ceo_${ts}` }]);

    const streamMsgTs = Date.now() + 1;
    const streamMsgId = `pa_${streamMsgTs}`;
    setLocalMessages((prev) => [...prev, { role: "agent", text: "", agentId: "pa", ts: streamMsgTs, id: streamMsgId, streaming: true }]);

    try {
      const byokHeaders = getBYOKHeaders();
      const res = await fetch("/api/ceo/message", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...byokHeaders },
        body: JSON.stringify({ content: text }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedReply = false;
      let streamEnded = false;

      while (!streamEnded) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "token" && event.token) {
              receivedReply = true;
              setLocalMessages((prev) =>
                prev.map((m) => m.id === streamMsgId ? { ...m, text: m.text + event.token } : m)
              );
            }
            if (event.type === "done" || event.type === "end") {
              receivedReply = true;
              streamEnded = true;
              setLocalMessages((prev) =>
                prev.map((m) => m.id === streamMsgId ? { ...m, streaming: false } : m)
              );
            }
            if (event.type === "error") {
              streamEnded = true;
              setLocalMessages((prev) =>
                prev.map((m) => m.id === streamMsgId ? { ...m, text: event.message || "Error.", streaming: false } : m)
              );
            }
          } catch { /* malformed SSE line */ }
        }
      }
      // Don't wait for the proxy's 60s abort if the server never closes the stream
      if (streamEnded) reader.cancel().catch(() => { /* ignore */ });
      // Finalize the bubble: clear the cursor; only show an error if nothing arrived
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === streamMsgId
            ? { ...m, streaming: false, text: m.text || (receivedReply ? m.text : "Server unreachable.") }
            : m
        )
      );
    } catch {
      // Keep any partial/full reply already streamed; only report unreachable if nothing arrived
      setLocalMessages((prev) =>
        prev.map((m) => m.id === streamMsgId ? { ...m, text: m.text || "Server unreachable.", streaming: false } : m)
      );
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(480px, 90vw)",
        backgroundColor: "rgba(10, 10, 20, 0.92)",
        border: "1px solid #FFCC00",
        borderRadius: "0.75rem",
        backdropFilter: "blur(12px)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        maxHeight: "340px",
      }}
    >
      {/* Header — P-03: active provider badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid rgba(255,204,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#FFCC00" }}>
          <MessageSquare style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>CEO → Alex (PA)</span>
          {activeProvider && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                backgroundColor: "rgba(255,204,0,0.15)",
                border: "1px solid rgba(255,204,0,0.4)",
                color: "#FFCC00",
                borderRadius: "0.3rem",
                padding: "1px 6px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {activeProvider.label}
            </span>
          )}
          {!activeProvider && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                backgroundColor: "rgba(100,100,100,0.2)",
                border: "1px solid rgba(100,100,100,0.4)",
                color: "#888",
                borderRadius: "0.3rem",
                padding: "1px 6px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Ollama
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ color: "#666", background: "none", border: "none", cursor: "pointer" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          minHeight: "160px",
        }}
      >
        {localMessages.length === 0 && (
          <p style={{ color: "#555", fontSize: "0.8rem", textAlign: "center", marginTop: "2rem" }}>
            Type a command to Alex, your PA...
          </p>
        )}
        {localMessages.map((msg, i) => (
          <div
            key={msg.id || i}
            style={{
              alignSelf: msg.role === "ceo" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              // P-02: report bubble has distinct amber border + slightly different bg
              backgroundColor: msg.isReport
                ? "rgba(255, 204, 0, 0.1)"
                : msg.role === "ceo"
                  ? "#FFCC00"
                  : "rgba(255,255,255,0.08)",
              color: msg.role === "ceo" ? "#000" : "#e0e0e0",
              padding: "0.4rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.82rem",
              lineHeight: 1.4,
              border: msg.isReport ? "1px solid rgba(255,204,0,0.5)" : "none",
            }}
          >
            {msg.role === "agent" && (
              <span
                style={{
                  fontSize: "0.7rem",
                  display: "block",
                  marginBottom: 2,
                  color: msg.isReport ? "#FFCC00" : "rgba(255,204,0,0.7)",
                  fontWeight: msg.isReport ? 700 : 400,
                }}
              >
                {msg.isReport ? "📋 Alex — Report" : (msg.agentId || "Agent")}
              </span>
            )}
            {msg.text}
            {msg.streaming && (
              <span
                style={{
                  display: "inline-block",
                  width: "2px",
                  height: "1em",
                  background: "currentColor",
                  marginLeft: "2px",
                  verticalAlign: "text-bottom",
                  animation: "blink 1s step-end infinite",
                }}
              />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.75rem",
          borderTop: "1px solid rgba(255,204,0,0.15)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Give Alex a command..."
          disabled={sending}
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,204,0,0.3)",
            borderRadius: "0.4rem",
            color: "#fff",
            padding: "0.4rem 0.75rem",
            fontSize: "0.85rem",
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            backgroundColor: "#FFCC00",
            border: "none",
            borderRadius: "0.4rem",
            padding: "0.4rem 0.75rem",
            cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            opacity: sending || !input.trim() ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {sending ? (
            <Loader2 style={{ width: 16, height: 16, color: "#000", animation: "spin 1s linear infinite" }} />
          ) : (
            <Send style={{ width: 16, height: 16, color: "#000" }} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
