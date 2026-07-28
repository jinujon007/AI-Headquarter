"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

const DISMISS_KEY = "aihq:ollama-banner-dismissed";
const QUALITY_DISMISS_KEY = "aihq:quality-banner-dismissed";

// Returns true if the user has at least one BYOK key configured
function hasByokKey(): boolean {
  const keys = ["apiKey_anthropic", "apiKey_openai", "apiKey_openrouter", "apiKey_groq", "apiKey_gemini"];
  return keys.some((k) => Boolean(localStorage.getItem(k)));
}

type BannerMode = "ollama-down" | "preview-quality" | null;

export function OllamaStatusBanner() {
  const [mode, setMode] = useState<BannerMode>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: { checks?: Array<{ name: string; status: string }> }) => {
        const ollamaCheck = data.checks?.find((c) => c.name === "Ollama");
        const ollamaDown = ollamaCheck?.status === "down";
        if (ollamaDown && !hasByokKey()) {
          if (!sessionStorage.getItem(DISMISS_KEY)) setMode("ollama-down");
        } else if (!ollamaDown && !hasByokKey()) {
          // Ollama works but small local models produce draft-grade output —
          // recommend BYOK for quality without hiding the free path.
          if (!localStorage.getItem(QUALITY_DISMISS_KEY)) setMode("preview-quality");
        }
      })
      .catch(() => {
        if (!hasByokKey() && !sessionStorage.getItem(DISMISS_KEY)) setMode("ollama-down");
      });
  }, []);

  const dismiss = () => {
    if (mode === "ollama-down") sessionStorage.setItem(DISMISS_KEY, "1");
    else localStorage.setItem(QUALITY_DISMISS_KEY, "1");
    setMode(null);
  };

  if (!mode) return null;

  const isDown = mode === "ollama-down";
  const accent = isDown ? "#EAB308" : "#60a5fa";
  const bg = isDown ? "rgba(234, 179, 8, 0.12)" : "rgba(59, 130, 246, 0.10)";
  const border = isDown ? "rgba(234, 179, 8, 0.4)" : "rgba(59, 130, 246, 0.35)";

  return (
    <div
      style={{
        position: "fixed",
        top: "48px", // below TopBar
        left: "68px", // beside Dock
        right: 0,
        zIndex: 100,
        backgroundColor: bg,
        borderBottom: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.55rem 1.25rem",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        {isDown ? (
          <AlertTriangle style={{ width: 16, height: 16, color: accent, flexShrink: 0 }} />
        ) : (
          <Info style={{ width: 16, height: 16, color: accent, flexShrink: 0 }} />
        )}
        {isDown ? (
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
            <a href="/settings" style={{ color: "#FFCC00", textDecoration: "underline" }}>
              add a BYOK API key
            </a>
            {" "}in Settings.
          </span>
        ) : (
          <span style={{ fontSize: "0.82rem", color: "#dbeafe" }}>
            <strong style={{ color: "#93c5fd" }}>Running on the free local model (preview quality).</strong>
            {" "}Small local models produce draft-grade output. For client-ready results,{" "}
            <a href="/settings" style={{ color: "#93c5fd", textDecoration: "underline" }}>
              add an API key
            </a>
            {" "}(Claude, GPT-4o, …) — you can set a monthly budget cap on the same page.
          </span>
        )}
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
