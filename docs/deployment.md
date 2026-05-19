# AI HQ — Deployment Guide

---

## Local Development (default)

**Requirements:**
- Node.js ≥ 22
- [Ollama](https://ollama.com) installed and running

```bash
git clone https://github.com/jinujon007/AI-Headquarter.git
cd AI-Headquarter

# Generate AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

cp .env.example .env
# Edit .env: set ADMIN_PASSWORD and paste the AUTH_SECRET from above

ollama pull llama3.1:8b   # ~4.7 GB, one-time download

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login with `ADMIN_PASSWORD`.

**Ports:**
- `3000` — dashboard (Next.js)
- `3001` — server (Colyseus + Express)

---

## Docker (recommended for clean environments)

```bash
cp .env.example .env   # fill in ADMIN_PASSWORD and AUTH_SECRET

docker compose up
```

This starts both server and dashboard. Ollama must be running on the host:

```bash
# macOS / Linux:
ollama serve           # in a separate terminal
ollama pull llama3.1:8b

# The server container connects to Ollama at host.docker.internal:11434 by default.
# Override with OLLAMA_URL=http://your-ollama-host:11434 in .env
```

**Data persistence:** The `output/` and `data/` directories are mounted as Docker volumes — agent outputs and memories survive container restarts.

---

## Railway (one-click cloud)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/aihq)

**Important for Railway deployment:**

1. Set `ALLOWED_ORIGIN` to your dashboard Railway URL (e.g. `https://aihq-dashboard.up.railway.app`)
2. Set `OLLAMA_URL` to an external Ollama instance or use a Railway Ollama service
3. Set a strong `ADMIN_PASSWORD` and a generated `AUTH_SECRET`

Railway does not provide GPU instances. For best performance with local models, use a BYOK provider (OpenRouter, Groq, OpenAI).

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_PASSWORD` | ✅ | — | Dashboard login password |
| `AUTH_SECRET` | ✅ | — | Cookie signing key (min 32 chars) |
| `OLLAMA_URL` | — | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | — | `llama3.1:8b` | Default model for agents |
| `ALLOWED_ORIGIN` | — | `http://localhost:3000` | CORS allowed origin (set for public deploy) |
| `PORT` | — | `3001` | Server port |
| `TAVILY_API_KEY` | — | — | Enables real web search (free tier at tavily.com) |

BYOK API keys are **not** set as environment variables — they're entered in the dashboard Settings page per-session.

---

## Production Hardening Checklist

Before exposing AI HQ to the internet:

- [ ] Set `ADMIN_PASSWORD` to a strong unique password (not `change-me-*`)
- [ ] Generate a real `AUTH_SECRET` (32-char hex minimum)
- [ ] Set `ALLOWED_ORIGIN` to your dashboard's exact origin
- [ ] Run behind a reverse proxy (nginx, Caddy) with TLS
- [ ] Do not expose port 3001 directly — the dashboard proxies all server calls
- [ ] Review `output/` directory permissions — agents write files here
- [ ] Consider enabling Ollama authentication if it's on a shared network

---

## Choosing a Model

| Model | Size | Speed | Quality | Recommended for |
|-------|------|-------|---------|-----------------|
| `llama3.1:8b` | 4.7 GB | Fast | Good | Default, everyday use |
| `llama3.1:70b` | 40 GB | Slow | Excellent | High-quality output |
| `mistral:7b` | 4.1 GB | Fast | Good | Lightweight alternative |
| `qwen2.5:7b` | 4.7 GB | Fast | Very good | Strong at code tasks |

Set the model in `.env`: `OLLAMA_MODEL=qwen2.5:7b`

For BYOK: model is specified per-request from the dashboard Settings page.
