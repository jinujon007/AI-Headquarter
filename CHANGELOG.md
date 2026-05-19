# Changelog

All notable changes to AI HQ are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

## Program Review + Phase 9 Expansion [Brain: Claude Code] [2026-05-19]

Files changed:
- MODIFIED: apps/dashboard/src/lib/paths.ts (restored `output` function accidentally deleted from working copy — critical bug fix)
- MODIFIED: TASK_QUEUE.md (reset T-014 IN-PROGRESS→DONE; added Phase 9 tasks T-063 through T-075)
- CREATED: PROGRAM_FRAMEWORK.md (execution framework: risk register, critical path, sprint structure, ownership map, launch definition of done)

Notes: Full audit of all 62 completed tasks. 15 gaps identified. 13 new Phase 9 tasks added covering: TypeScript verification, dead code removal, server watch mode, Docker healthchecks, API smoke tests, rate limiting, semantic-release config, demo recording script, and launch checklist.

---

### Security
- Replaced `exec()` shell invocation with `vm.runInNewContext()` in `ToolExecutor` — eliminates shell injection vulnerability in code execution tool
- Fixed `readFile` path traversal — now uses `path.resolve` + strict prefix check to enforce `output/` sandbox
- Scoped CORS to `ALLOWED_ORIGIN` environment variable (default `http://localhost:3000`) — prevents wildcard CORS on public deployments

### Changed
- `.env.example` now includes `AUTH_SECRET` generation command and `ALLOWED_ORIGIN` variable with documentation
- Removed `react-hook-form` from root `package.json` (belongs in `apps/dashboard`)
- `readFile` output increased from 500 to 2000 characters

### Added
- `docs/architecture.md` — system design, think cycle, adapter pattern, data flows
- `docs/api.md` — full REST and Colyseus WebSocket API reference
- `docs/deployment.md` — local, Docker, Railway deployment guide with model selection guide
- `examples/demo-workflows/landing-page.md` — step-by-step flagship demo walkthrough
- `.github/workflows/security.yml` — CodeQL analysis + dependency review on PRs
- `.github/workflows/release.yml` — semantic-release automation on `main`
- `.github/workflows/labeler.yml` — auto-labels PRs by changed file path
- `.github/dependabot.yml` — weekly npm updates, monthly GitHub Actions updates
- `.github/labeler.yml` — path-to-label mapping for PR auto-labeler
- `.github/FUNDING.yml` — GitHub Sponsors placeholder
- `.devcontainer/devcontainer.json` — GitHub Codespaces one-click setup
- `scripts/setup.sh` — pre-flight checks (Node version, Ollama, model pull, .env generation)
- CI now runs `npm test` across all workspaces and `npm audit --audit-level=high`

---

## [0.1.0] — 2025-05-19

Initial public release. Phases 0–8 complete.

### Added

**Core multi-agent runtime**
- Colyseus room (`OfficeRoom`) with 5 default agents: Alex (PA), Dev, Ray (Researcher), Cleo (Copywriter), Max (Analyst)
- Agent state machine: idle → thinking → working → talking → in-meeting
- CEO message handler with PA routing and specialist delegation
- Colyseus WebSocket events: `agent:status`, `agent:message`, `agent:action`, `agent:hired`, `task:created`, `task:completed`
- Board meeting sequence — PA triggers multi-agent discussion, agents move to the board room

**3D Office Dashboard**
- Next.js 15 dashboard with React Three Fiber 3D office
- Voxel agent avatars with real-time position sync from Colyseus state
- CEO chat panel with streaming SSE response and localStorage history
- Task board, Agents page (with hire UI), Costs page, Settings (BYOK keys)

**Tool execution (sandboxed)**
- `code_execute` — JavaScript sandbox via `vm.runInNewContext` (5s timeout)
- `web_search` — Tavily API with DuckDuckGo fallback
- `write_file` — agents write to `output/<agentId>/timestamp-slug.ext`
- `read_file` — sandboxed to `output/` directory

**BYOK adapter system**
- `OllamaAdapter` — default, local, free
- `OpenAICompatibleAdapter` — covers OpenAI, OpenRouter, Groq, Gemini
- Streaming SSE token-by-token response from PA agent
- Per-request adapter selection via request headers

**Persistence**
- SQLite memory store with cosine similarity semantic search (optional, via Ollama embeddings)
- Session restore — task history replayed to new WebSocket clients
- Token tracking and cost estimation per session in `usage_log` table

**Infrastructure**
- Dockerfiles for server and dashboard; `docker-compose.yml` one-command boot
- GitHub Actions CI — typecheck, build, test
- `LICENSE` (MIT), `CODE_OF_CONDUCT.md`, `SECURITY.md`
- Issue templates (bug report, feature request — YAML forms)
- `CODEOWNERS`, `PULL_REQUEST_TEMPLATE.md`, `.gitattributes`

### Attribution
- [agent-office](https://github.com/harishkotra/agent-office) by harishkotra — MIT License
- [TenacitOS](https://github.com/carlosazaustre/tenacitOS) by carlosazaustre — MIT License

---

[Unreleased]: https://github.com/jinujon007/AI-Headquarter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jinujon007/AI-Headquarter/releases/tag/v0.1.0
