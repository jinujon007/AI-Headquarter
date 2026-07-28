<div align="center">

# AI HQ — Run Your Own AI Startup

**You are the CEO. AI agents are your team.**  
Type a directive. Watch agents collaborate in a live 3D office and deliver real files to your workspace.

[![CI](https://github.com/jinujon007/AI-Headquarter/actions/workflows/ci.yml/badge.svg)](https://github.com/jinujon007/AI-Headquarter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](package.json)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/jinujon007/AI-Headquarter)
[![Open in Dev Containers](https://img.shields.io/static/v1?label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/jinujon007/AI-Headquarter)

<!-- DEMO GIF: replace this line with: ![AI HQ Demo](docs/demo.gif) -->
> **Demo GIF:** see the [recording script](examples/demo-workflows/recording-script.md) — first recorded run will be added here.

</div>

---

## What it does

```
You type:  "Build a landing page for a SaaS that helps restaurants manage food waste"

PA routes: → Ray (research) + Cleo (copy) + Dev (HTML)
Agents:      board meeting → each agent works → files written to output/
PA reports: "Done. output/dev/landing-page.html is ready."
```

**Everything runs locally. Ollama is the default — no API cost, no data leaves your machine.**  
Bring your own key (Claude, OpenAI, Groq, Gemini, OpenRouter) if you want faster models.

---

## Quick Start

**Prerequisites:** [Node.js ≥ 22](https://nodejs.org) · [Ollama](https://ollama.com) installed and running

```bash
git clone https://github.com/jinujon007/AI-Headquarter.git
cd AI-Headquarter
cp .env.example .env
ollama pull llama3.2:3b
npm install && npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — log in with `ADMIN_PASSWORD` from your `.env`.

Measured on a mid-range laptop: ~2 minutes from clone to first PA reply once Node and the Ollama model are downloaded (the one-time `ollama pull` is ~2 GB). A full demo command (research → copy → built HTML page) takes 2–7 minutes on the free local model.

**Default model:** `llama3.2:3b` (~2 GB — fits in 4 GB VRAM). **Preview quality:** a 3B local model reliably completes the full agent loop, but its output is draft-grade (10-run blind test median: 5/10). For client-ready output, add a BYOK key (Claude, GPT-4o) in Settings — and set a monthly budget cap there. On GPUs with ≥ 6 GB VRAM, `llama3.1:8b` improves local quality: `ollama pull llama3.1:8b` and set `OLLAMA_MODEL=llama3.1:8b` in `.env`.

> **Single-tenant:** AI HQ is single-tenant — one instance per user. Do not share a hosted instance; there is no user isolation between people using the same deployment.

---

## Docker (one command)

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

## Docs

- [Architecture](docs/architecture.md) — system design, think cycle, adapter pattern, data flows
- [API Reference](docs/api.md) — REST endpoints + Colyseus WebSocket events
- [Deployment](docs/deployment.md) — local, Docker, Railway, env vars, model selection
- [Demo workflows](examples/demo-workflows/) — step-by-step example runs

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
