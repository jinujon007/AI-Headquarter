"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "aihq:ollama-banner-dismissed";

// Returns true if the user has at least one BYOK key configured
function hasByokKey(): boolean {
  const keys = ["apiKey_anthropic", "apiKey_openai", "apiKey_openrouter", "apiKey_groq", "apiKey_gemini"];
  return keys.some((k) => Boolean(localStorage.getItem(k)));
}

export function OllamaStatusBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if user dismissed this session
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    fetch("/api/health")
      .then((r) => r.json())
      .then((data: any) => {
        const ollamaCheck = data.checks?.find((c: any) => c.name === "Ollama");
        const ollamaDown = ollamaCheck?.status === "down";
        // Only show if Ollama is down AND no BYOK provider is configured
        if (ollamaDown && !hasByokKey()) setVisible(true);
      })
      .catch(() => {
        // If health check itself fails, show the banner as a precaution
        if (!hasByokKey()) setVisible(true);
      });
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "48px", // below TopBar
        left: "68px", // beside Dock
        right: 0,
        zIndex: 100,
        backgroundColor: "rgba(234, 179, 8, 0.12)",
        borderBottom: "1px solid rgba(234, 179, 8, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.55rem 1.25rem",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <AlertTriangle style={{ width: 16, height: 16, color: "#EAB308", flexShrink: 0 }} />
        <span style={{ fontSize: "0.82rem", color: "#fef9c3" }}>
          <strong style={{ color: "#FDE047" }}>Ollama not detected.</strong>
          {" "}Agents need a local LLM to think. Either{" "}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#FFCC00", textDecoration: "underline" }}
          >
            install Ollama
          </a>
          {" "}and run{" "}
          <code style={{ background: "rgba(255,255,255,0.08)", borderRadius: "3px", padding: "0 4px", fontSize: "0.78rem" }}>
            ollama pull llama3.2:3b
          </code>
          , or{" "}
          <a
            href="/settings"
            style={{ color: "#FFCC00", textDecoration: "underline" }}
          >
            add a BYOK API key
          </a>
          {" "}in Settings.
        </span>
      </div>
      <button
        onClick={dismiss}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#888", flexShrink: 0 }}
        title="Dismiss"
      >
        <X style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}
