<div align="center">

# AI HQ — Run Your Own AI Startup

**You are the CEO. AI agents are your team.**  
Give a directive. Watch agents collaborate in a 3D office and deliver real files to your workspace.

[![CI](https://github.com/jinujon007/AI-Headquarter/actions/workflows/ci.yml/badge.svg)](https://github.com/jinujon007/AI-Headquarter/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/jinujon007/AI-Headquarter?style=social)](https://github.com/jinujon007/AI-Headquarter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](package.json)

> **Demo GIF coming soon** — [star to get notified at launch](https://github.com/jinujon007/AI-Headquarter)

</div>

---

## What is AI HQ?

AI HQ is a local-first, open source browser dashboard where you run an AI startup.

- **3D office** (React Three Fiber) — agents have desks, walk to the board room, go idle
- **Multi-agent runtime** (Colyseus + Ollama) — agents think, delegate, and execute tools
- **CEO chat** — type a directive, PA agent routes it, specialists deliver output files
- **BYOK** — Claude, OpenAI, OpenRouter, Groq, Gemini — or run 100% free with Ollama

**Demo flow:** Type *"Build a landing page for a SaaS that helps restaurants manage food waste"* → PA delegates to Ray (research), Cleo (copy), Dev (HTML) → board meeting → files land in `output/`

---

## Quick Start

**Prerequisites:** Node.js ≥ 22, [Ollama](https://ollama.com) installed and running

```bash
git clone https://github.com/jinujon007/AI-Headquarter.git
cd AI-Headquarter
cp .env.example .env          # fill in ADMIN_PASSWORD + AUTH_SECRET
ollama pull llama3.1:8b
npm install
npm run dev                   # server :3001 + dashboard :3000
```

Open [http://localhost:3000](http://localhost:3000) — login with `ADMIN_PASSWORD`.

---

## Deploy in One Click

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/aihq)

Or Docker:

```bash
cp .env.example .env
docker compose up
```

---

## Agents (ships at launch)

| Agent | Role | Default tools |
|-------|------|---------------|
| **Alex** (PA) | Orchestrator — routes CEO commands, delegates, reports back | All internal APIs |
| **Dev** | Developer — code writing, debugging | code-exec, file-write, file-read |
| **Ray** | Researcher — web research, synthesis | web-search, file-write |
| **Cleo** | Copywriter — content, emails, landing pages | file-write, web-search |
| **Max** | Analyst — market intel, competitor research | web-search, file-write |

Say *"hire a financial analyst"* → PA spawns a new agent with a desk in the 3D office.

---

## BYOK (optional)

Add your API key in dashboard Settings. No key is stored server-side.

| Provider | Models |
|----------|--------|
| Ollama (default) | Any local model — free |
| Anthropic | Claude Opus, Sonnet, Haiku |
| OpenAI | GPT-4o, GPT-4o-mini |
| OpenRouter | Access to 100+ models |
| Groq | Fast inference |
| Google | Gemini 1.5 Pro / Flash |

---

## Architecture

```
apps/
├── dashboard/          ← Next.js 15 — browser UI + 3D office
└── server/             ← Colyseus + Express — agent runtime + SQLite

packages/
├── core/               ← Agent state machine, memory, task queue
├── adapters/           ← Ollama + BYOK LLM adapters
└── types/              ← Shared TypeScript API contract
```

**Data flow:**
```
CEO chat → POST /api/ceo/message → Alex (PA) → specialist agents
→ tool execution → output files → Colyseus WebSocket → 3D office + activity feed
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — how to add agents, tools, and LLM adapters.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## Attribution

- [agent-office](https://github.com/harishkotra/agent-office) by harishkotra — MIT License
- [TenacitOS](https://github.com/carlosazaustre/tenacitOS) by carlosazaustre — MIT License

---

## License

[MIT](LICENSE) — 2025 Jinu Joshi
