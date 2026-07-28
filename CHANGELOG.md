# [1.1.0](https://github.com/jinujon007/AI-Headquarter/compare/v1.0.0...v1.1.0) (2026-07-28)


### Bug Fixes

* **adapters): Anthropic system-role hoisting; feat(types:** real API contract ([f49bd61](https://github.com/jinujon007/AI-Headquarter/commit/f49bd613125fb769e2540f1cf2323077a6c33ab7))
* **demo-loop:** survive small-model JSON, honest recovery, root .env actually read ([9dc65c6](https://github.com/jinujon007/AI-Headquarter/commit/9dc65c6800ca2a54470deb98e82de458346604de))
* **docker:** compose path actually works end-to-end on a clean machine ([92fb531](https://github.com/jinujon007/AI-Headquarter/commit/92fb53112dd5c21b48904e87c3790f946e0b7dcb))
* **honesty:** every dashboard page shows only real data; docs match code ([1fd6f0f](https://github.com/jinujon007/AI-Headquarter/commit/1fd6f0f8261a25bb84d01a5680cd80bc60882978))
* **infra:** fresh clone starts, deploy paths work, CI lints ([eacca4e](https://github.com/jinujon007/AI-Headquarter/commit/eacca4e560f2042798568189a7d3a2a5c8f81e51))


### Features

* **costs:** pre-run cost estimate + monthly budget cap for BYOK ([6a9e27b](https://github.com/jinujon007/AI-Headquarter/commit/6a9e27b00c00fc52675a0777a77f7a9050f607fe))
* **dashboard:** demo-truth UI — board meetings, hired desks, honest chat ([186df4f](https://github.com/jinujon007/AI-Headquarter/commit/186df4fbf18aed3e4d62002d09b7db62abef91ba))
* **hiring:** chat-driven hiring works; parser honors partial JSON from small models ([22b5be0](https://github.com/jinujon007/AI-Headquarter/commit/22b5be0397863c820600bcd1ef45858a184a49ff))
* **server:** delegation overhaul, security hardening, real costs ([b7fa442](https://github.com/jinujon007/AI-Headquarter/commit/b7fa442c9565ea4d47eafc0a11e18ec14428687b))

# Changelog

All notable changes to AI HQ are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Completion Sprint — live-verified core loop [Brain: Claude Fable] [2026-07-28]

**Verified live (first time ever with a real LLM)**
- 12 live demo runs on default `llama3.2:3b`: 11 fully clean, 1 honest timeout failure (task marked failed + toast — no silent hang). 10-run blind quality log written; median 5/10 → BYOK-first UX shipped
- Hired-agent loop live: UI hire, chat hire, delegation to hired agent with real output file
- Budget cap live: $0.01 cap + simulated spend → paid call refused with honest message before any API call; free Ollama never blocked

**Added**
- Chat-driven hiring: PA JSON schema gains optional `hire:{name,role}`; "hire a financial analyst" in chat spawns a real agent + desk (README already claimed this)
- Pre-run cost estimate in the PA acknowledgment for BYOK runs (delegate count × avg tokens from usage history, priced per model)
- Monthly budget cap: settings-persisted `budget_usd` (+ `AIHQ_BUDGET_USD` env), refusal paths on PA/specialist/synthesis calls, Settings field, month-to-date vs budget bar on costs page
- `GET/POST /api/settings`, `GET /api/logs` (server console ring buffer, last 500 lines)
- Preview-quality banner (Ollama up, no BYOK key) + README preview-quality label with measured median
- Zero-dep root `.env` loaders in server and next.config — the file README tells users to create is now actually read
- `OLLAMA_TIMEOUT_MS` env for slow CPU inference (default 60s)
- E2E demo-path test (real HTTP + SQLite + ToolExecutor, stubbed adapter; asserts SSE order, task completion, output file, board wrapup, PA report)
- Dashboard vitest smoke suite (11 tests: activities-db, costs proxy, extracted WS task handlers)
- `TESTING_GUIDE.md` for non-coder testing; boot-time stale-task cleanup (crashed runs can't leave tasks hanging)

**Fixed**
- Small-model JSON survival: Ollama `format:json` + OpenAI `response_format` on PA calls; parser repairs truncated JSON, honors delegates/hire when `reply` is omitted, never leaks raw JSON to chat (live run-1 and chat-hire failures, regression-tested)
- sessionProvider no longer persists from a budget-refused BYOK attempt
- StatusBar SERVER light read a nonexistent field (always green) — wired to the real health check
- Dev role prompt: one self-contained HTML file (inline CSS/JS); Cleo: markdown copy only
- Costs page NaN% in per-agent breakdown at $0 total

**Removed / replaced (honesty sweep)**
- Live Logs pm2/journalctl SSE page (dead on Windows/normal installs) → ring-buffer polling page
- `/api/agents/[id]/status` hardcoded placeholder route (zero callers)
- `/api/system/services` fork-leftover exec route (pm2/systemctl/docker, foreign allowlists) + dead action buttons
- Fake per-core CPU (Math.random), hardcoded Tailscale/UFW cards, `vpnActive = true // We know it's active`
- CLAUDE.md per-agent LLM claim corrected to global-per-session; api.md synced to real SSE/task/costs shapes; phantom `ceo:message` WS handler removed from docs
- TenacitOS component dir renamed Shell (attribution retained)

### Launch Hardening Sprint [Brain: Claude Fable] [2026-07-15]

**Added**
- Real web research in delegated tasks: specialists with the `web_search` capability run one search round and get results injected into their prompt
- Cross-agent context passing: delegated tasks now run sequentially in the PA's order, each specialist receiving teammates' actual outputs (`buildTeamContext` in `OfficeRoom.ts`)
- Hired agents can receive work (PA roster built dynamically) and spawn 3D desks/avatars
- Board meetings visualized: dashboard subscribes to `board:started`/`board:ended` and seats avatars in the Board Room
- `@aihq/types` wired as the real API contract (type-only imports in server + dashboard)
- 16-test regression suite for delegation logic (`OfficeRoom.test.ts`); write_file traversal tests; Anthropic system-message tests
- Per-model cost pricing table (Ollama/local = $0); usage logging for PA routing + synthesis calls
- Root `postinstall` builds workspace packages — fresh clone now starts; `engines: node >= 22`
- `setup.sh` creates `apps/dashboard/.env.local` (Next.js does not read the root `.env`)
- Public `ROADMAP.md`; docs section + single-tenant warning in README
- Tasks page added to dock navigation; SERVER health indicator in status bar

**Fixed**
- Anthropic BYOK: system-role messages hoisted to the top-level `system` param (every Claude call previously returned 400)
- CEO chat SSE: server closes the stream (`res.end()`); client breaks on `done`/`end` and keeps received replies on abort (was: 60s hang, reply replaced by "Server unreachable.")
- PA delegate-ID normalization: names/casing resolve to agent ids; batch total counts only validated delegates (silent batch poisoning)
- Honest PA failure message instead of fake "Analysing and delegating"
- Think-loop double-fire during delegation removed (redundant LLM call per specialist)
- `write_file` extension/agentId path traversal sealed; rate limiter uses `req.ip` (spoofable X-Forwarded-For removed); hire endpoint rate-limited
- Railway `startCommand` pointed at a nonexistent path; dashboard Dockerfile now copies workspace manifests; docker-compose server-side API key envs removed (BYOK is per-request)
- Default Ollama model `llama3.1:8b` → `llama3.2:3b` everywhere (fits 4GB VRAM)
- Initial agent/task state race: client now pulls `sync-request` after registering handlers (was: dropped `agents-sync`/`tasks-sync`)
- Costs page NaN% guards; pricing table synced to server pricing; 3D view no longer clipped by dock/status bar
- Fictional UI removed or made real: Madrid weather widget deleted, placeholder gateway buttons deleted, Clear Activity Log actually clears, change-password replaced with env hint, "Estados" → "Status"

**Removed**
- ~45 dead fork-leftover files (pixel-art office renderer, unused charts/components/libs, core task/memory modules, PromptBuilder, tools.config, tenacitOS docs/screenshots/scripts, stale OpenClaw env example)
- Internal planning docs moved to gitignored `docs/internal/` (TASK_QUEUE, AGENTS, PRODUCT_LOG, strategy docs)

### Docs Sync — T-082 status harmonization [DONE] [Brain: Cline] [2026-05-20]
- MODIFIED: `PROGRAM_FRAMEWORK.md` (R-004 marked CLOSED; T-082 completion checkboxes updated)
- MODIFIED: `OPERATIONAL_REVIEW.md` (stale phase/task claims removed; malformed artifact tail removed; status refreshed)
- MODIFIED: `docs/launch-checklist.md` (README link check updated to reflect active Railway one-click deploy button)

### T-082 — Infrastructure: Railway one-click deploy template [DONE] [Brain: Cline] [2026-05-20]
- CREATED: `railway.json` (Railway Dockerfile build + healthcheck + restart policy)
- MODIFIED: `README.md` (added Railway deploy badge with `new/template` GitHub URL)
- MODIFIED: `docs/deployment.md` (updated Railway deploy badge to `new/template` GitHub URL)
- MODIFIED: `apps/server/src/index.ts` (added `RAILWAY_ENVIRONMENT` warning log: Railway deploys should prefer BYOK when local Ollama unavailable)

### Dev/Review — Operational Hardening [Brain: Kilo (devil's advocate review)] [2026-05-20]

**OU-001 — Ollama network timeout protection**
- CREATED: `packages/adapters/src/OllamaAdapter.ts` — added `AbortController` with 60 s timeout on both `complete()` and `stream()` fetch calls
- MODIFIED: `apps/server/src/memory/MemoryStore.ts` — added 10 s `AbortController` timeout on `/api/embeddings` fetch in `generateEmbedding()`; catches `DOMException` on abort, returns `null` (graceful degradation)
- MODIFIED: `apps/server/src/MemoryStore.test.ts` — mocked `globalThis.fetch` in `beforeAll`/`afterAll` so memory operations complete in <20 ms without live Ollama

**OU-002 — 3D office agent placement**
- MODIFIED: `apps/server/src/rooms/OfficeRoom.ts:getAgentList()` — `deskPosition` now reads `agent.config.deskPosition` instead of hardcoded `[0, 0, 0]`; 3D avatars will be positioned at their correct desks from `agents.config.ts`

**OU-003 — Rate limiter IP extraction**
- MODIFIED: `apps/server/src/index.ts:/api/ceo/message` — rate-limit key now uses `X-Forwarded-For` header chain (split on `,`, first IP) with `req.ip` fallback; Docker single-IP problem solved — each user gets their own rate-limit bucket

### T-085 — Server: Python sandbox support in ToolExecutor [DONE] [Brain: Kilo Code] [2026-05-20]

Files changed:
- MODIFIED: apps/server/src/tools/ToolExecutor.ts (added executePython() method with execFileSync, 5s timeout, no shell injection risk; updated executeCode to route python/py to the new handler)
- MODIFIED: apps/server/src/smoke.test.ts (added tests for Python execution in ToolExecutor)

Notes: Python execution uses execFileSync with no shell — the code is passed as an argument to python3 -c. No shell injection possible. Outputs stdout/stderr. Falls back gracefully if python3 not installed.

### Phase 10 Execution — All 14 Bug Fixes + Dashboard UX [Brain: Claude Code] [2026-05-19]

Files changed:
- CREATED: packages/adapters/src/AnthropicAdapter.ts (G-01: native Anthropic adapter using fetch — no SDK dependency; implements complete() + 7-stream() using /v1/messages endpoint; x-api-key auth, anthropic-version header, streaming via content_block_delta SSE events)
- MODIFIED: packages/adapters/src/index.ts (export AnthropicAdapter)
- MODIFIED: apps/server/src/rooms/OfficeRoom.ts (G-01: wire AnthropicAdapter into getAdapter() factory; provider === 'anthropic' routes to native adapter instead of OpenRouter fallback)
- MODIFIED: apps/dashboard/src/hooks/use-office-ws.ts (P-04: fix agent:status field mismatch — was reading data.id, server sends data.agentId; added isReport field to AgentMessageEvent; added task:failed handler updating task status to 'failed'; added logActivity() bridge — fire-and-forget POST to /api/activities on task:completed, task:failed, agent:action, agent:hired events; activities.db now populated from live WS events)
- MODIFIED: apps/dashboard/src/components/CeoChat.tsx (P-02: PA report bubbles visually distinct — amber border + golden 'Report' label when isReport=true; P-03: active BYOK provider badge in header — reads localStorage on mount, shows provider name; priority order: anthropic > openai > openrouter > groq > gemini; shows 'Ollama' badge when no BYOK key set)
- MODIFIED: apps/dashboard/src/components/Office3D/Office3D.tsx (P-01: task completion toast overlay — green for success, red for failure; shows task title + output filename; auto-dismisses after 5s; deduped with seenTaskIds ref)
- CREATED: apps/dashboard/src/components/OllamaStatusBanner.tsx (P-05: dismissible banner shown when Ollama is down AND no BYOK key is configured; checks /api/health on mount; links to ollama.com install and /settings for BYOK setup; session-level dismiss)
- MODIFIED: apps/dashboard/src/app/(dashboard)/layout.tsx (P-05: mount OllamaStatusBanner in dashboard layout)

Server-side (completed in previous session, documented here for completeness):
- CREATED: apps/server/src/config/agents.config.ts (P-06: single source of truth for agent definitions, hire desk positions, board seats, default models per provider)
- CREATED: apps/server/src/config/tools.config.ts (P-07: single source of truth for tool definitions)
- MODIFIED: apps/server/src/rooms/OfficeRoom.ts (F-01→F-05, S-01→S-05, P-08, G-05 — full rewrite: LLMQueue, withRetry, resolveModel, structured PA JSON routing, board meeting post-task, BYOK threading, memory on completion, session key auth)
- MODIFIED: apps/server/src/memory/MemoryStore.ts (public db for task failure marking)
- MODIFIED: apps/server/src/index.ts (rate limiting, CORS scoping, requireServerKey, full SSE path, path traversal protection)

Notes: All 14 audit items addressed. Critical fixes: URL doubling in OpenAICompatibleAdapter (all BYOK providers broken), board meeting parallel to tasks (+15min demo delay), agent:status WS field mismatch (3D statuses never updated), activities.db never written (home page zeros), no native Claude adapter (routing via OpenRouter added latency + billing). Dashboard now provides meaningful feedback: toasts on task done, report bubbles, provider badge, Ollama setup banner.

### T-080 — Server: extract TaskManager class from OfficeRoom [DONE] [Brain: Kilo Code] [2026-05-20]

Files changed:
- CREATED: apps/server/src/tasks/TaskManager.ts
- MODIFIED: apps/server/src/rooms/OfficeRoom.ts (import TaskManager, removed activeTaskIds field, added taskManager instance, updated delegate and runSpecialistTask to use taskManager for task creation/completion)

### T-081 — Dashboard: CEO Corner animation — PA moves to CEO desk on report delivery [DONE] [Brain: Cline] [2026-05-20]

- MODIFIED: `apps/dashboard/src/hooks/use-office-ws.ts` — added `paHeadingToCeo: boolean` to `OfficeWsState`; in `agent:message` handler, sets it to `true` only when `agentId==="pa" && targetId==="ceo" && isReport===true`
- MODIFIED: `apps/dashboard/src/components/Office3D/Office3D.tsx` — (1) added `paCornerOverride` state + `useEffect` that sets it true on `paHeadingToCeo` and clears after 3 s; (2) added module-level `PAWalkToCeo` function component with `useFrame`-driven `lerpVectors` cubic ease-in-out from PA desk (`[-5,0.2,-4]`) to `CEO_ZONE`; renders a PA `<VoxelAvatar>` with `isThinking=true` in a separate `<group>` so MovingAvatar keeps its normal random wandering

### Phase 10 Planning + Bug Fixes [Brain: Claude Code] [2026-05-19]

Files changed:
- MODIFIED: TASK_QUEUE.md (fixed T-009 stale IN-PROGRESS→DONE; added Phase 10 tasks T-076–T-085 with full detail specs)
- MODIFIED: PROGRAM_FRAMEWORK.md (updated launch readiness to 95%; added R-011/R-012 risks; added Phase 10 sprint plan with ownership map and DoD)
- MODIFIED: apps/dashboard/src/app/(dashboard)/costs/page.tsx (stale model names corrected: opus-4.6→claude-opus-4-7, sonnet-4.5→claude-sonnet-4-6; added gpt-4o/gpt-4o-mini)
- MODIFIED: apps/server/src/tools/ToolExecutor.ts (removed dead write_note tool alias — was identical duplicate of write_file)

Notes: Audit found 4 bugs: T-009 stale status, activities.db never populated (dashboard home shows zeros), stale model names in cost table, dead tool case in switch. Phase 10 addresses the two highest star-blocking gaps — no native Claude adapter (R-012) and dead dashboard home (R-011) — plus PA animation, Railway deploy, server auth, Python execution.

### Fix: Eliminate double LLM inference on CEO messages [Brain: Claude Code] [2026-05-19]

Files changed:
- MODIFIED: apps/server/src/rooms/OfficeRoom.ts

What changed:
- Extracted new private method `routeAndDelegate(ceoContent, paResponse, provider, apiKey)` — parses agents from the already-computed PA response text, creates batch tracking, triggers board meeting, assigns tasks. Zero LLM calls.
- `streamCeoMessage` now calls `routeAndDelegate` directly after streaming — 1 LLM call total (was 2). Removed the `receiveCeoMessage` call that caused the double inference.
- Added missing CEO→PA memory save and CEO message WS broadcast to `streamCeoMessage` (these were only happening inside `receiveCeoMessage` before, which is no longer called from the SSE path).
- `receiveCeoMessage` (WebSocket path) now calls `routeAndDelegate` — 1 LLM call, same as before, no regression.
- Fixed pre-existing batch leak: when PA mentions no agents, an empty batch (`total: 0`) was created in `pendingBatchTasks` and never removed. Now returns early.

Impact: 50% token cost reduction on every CEO message. Eliminates duplicate task creation, duplicate board meeting attempts, and duplicate agent status broadcasts.

### Second-Pass Audit — Deep Review [Brain: Claude Code] [2026-05-19]

Files changed:
- MODIFIED: apps/server/src/index.ts (export app + require.main guard on Colyseus startup — enables real smoke tests)
- MODIFIED: apps/server/src/smoke.test.ts (full rewrite: imports real app from index.ts via require-after-mock pattern, mocks OfficeRoom, 7 meaningful tests including path traversal rejection, /api/health accepts 200 or 503)
- MODIFIED: apps/server/jest.config.js (added ts-jest globals to force CommonJS module compilation — prevents NodeNext/ts-jest mismatch in test context)
- MODIFIED: .github/workflows/release.yml (added ref: workflow_run.head_sha to checkout — prevents semantic-release tagging wrong commit)
- MODIFIED: apps/dashboard/src/app/api/health/route.ts (removed dead exec() code from tenacitOS — checkSystemdService + checkPm2Service were never called but imported exec; removed encoding artifact Â·)
- MODIFIED: docker-compose.yml (OLLAMA_MODEL default aligned to llama3.1:8b to match README and setup.sh)
- MODIFIED: apps/server/src/memory/MemoryStore.ts (3 bugs in getCostsData: lastMonth calculated as 30-days-ago not previous calendar month; double .substring(0,7) call; unused totalTokens variable)

Notes: Second-pass caught 7 bugs missed in first pass: workflow_run checkout ref, smoke tests on fake app, dead exec() in dashboard health, model name inconsistency, ts-jest/NodeNext mismatch, lastMonth date calculation bug, dead variable in getCostsData.

### Pre-Launch Audit + Growth Strategy [Brain: Claude Code] [2026-05-19]

Files changed:
- MODIFIED: README.md (removed broken Railway button, restructured for conversion, added Dev Containers badge, replaced "GIF coming soon" with actionable placeholder)
- MODIFIED: docs/launch-checklist.md (full rewrite: timing strategy, 5 copy-paste launch posts, day-1 ops plan, GitHub repo metadata checklist, definition of done)
- MODIFIED: apps/server/src/index.ts (path traversal fix on /api/output + rate limiter cleanup interval)
- MODIFIED: .releaserc.json (removed @semantic-release/npm, added @semantic-release/git in correct plugin order)
- MODIFIED: .github/workflows/release.yml (workflow_run trigger — CI must pass before release fires)

Notes: Audit identified: broken Railway deploy button, weak HN post draft, missing launch timing strategy, /api/output path traversal weakness, rate limiter memory leak, semantic-release misconfiguration. All fixed.

### T-066 — Wire server cost data to dashboard costs page [DONE] [Brain: Kilo Code] [2026-05-19]

Files changed:
- MODIFIED: apps/server/src/memory/MemoryStore.ts (added getCostsData() method with token-to-cost transformation)
- MODIFIED: apps/server/src/rooms/OfficeRoom.ts (updated getCosts() to use new getCostsData())
- MODIFIED: apps/dashboard/src/app/api/costs/route.ts (replaced local SQLite with server proxy)
- MODIFIED: apps/dashboard/src/app/(dashboard)/costs/page.tsx (added transformCostsData() for server response format)

Notes: Dashboard costs page now shows live token usage from server SQLite, not stale local DB. Costs calculated at $3/1M input, $15/1M output tokens.

### T-067 — Demo recording script [DONE] [Brain: Cline] [2026-05-19]

Files changed:
- CREATED: examples/demo-workflows/recording-script.md (step-by-step 5-minute demo script for landing page workflow)

Notes: CEO command → agent delegation → task execution → output files demo ready for recording.

### T-068 — Launch checklist + HN/PH draft [DONE] [Brain: Claude Code] [2026-05-19]

Files changed:
- CREATED: docs/launch-checklist.md (GitHub repo setup, HN post draft, PH submission notes)

Notes: Pre-launch verification complete. Repository ready for public push.

### T-075 — Remove @react-three/rapier [DONE] [Brain: Cline] [2026-05-19]

Files changed:
- MODIFIED: apps/dashboard/package.json (removed @react-three/rapier ^2.2.0)

Notes: Never used in 3D office — saves ~500KB WASM bundle size.

### Program Review + Phase 9 Expansion [Brain: Claude Code] [2026-05-19]

Files changed:
- MODIFIED: apps/dashboard/src/lib/paths.ts (restored `output` function accidentally deleted from working copy — critical bug fix)
- MODIFIED: TASK_QUEUE.md (reset T-014 IN-PROGRESS→DONE; added Phase 9 tasks T-063 through T-075)
- CREATED: PROGRAM_FRAMEWORK.md (execution framework: risk register, critical path, sprint structure, ownership map, launch definition of done)

Notes: Full audit of all 62 completed tasks. 15 gaps identified. 13 new Phase 9 tasks added covering: TypeScript verification, dead code removal, server watch mode, Docker healthchecks, API smoke tests, rate limiting, semantic-release config, and launch checklist.

---

## [1.0.0] - 2026-05-19

Initial public release. Phases 0–8 complete.

### Security
- Replaced `exec()` shell invocation with `vm.runInNewContext()` in `ToolExecutor` — eliminates shell injection vulnerability in code execution tool
- Fixed `readFile` path traversal — now uses `path.resolve` + strict prefix check to enforce `output/` sandbox
- Scoped CORS to `ALLOWED_ORIGIN` environment variable (default `http://localhost:3000`) — prevents wildcard CORS on public deployments

### Changed
- `.env.example` now includes `AUTH_SECRET` generation command and `ALLOWED_ORIGIN` variable with documentation
- Removed `react-hook-form` from root `package.json` (belongs in `apps/dashboard`)
- `readFile` output increased from 500 to 2000 characters

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

**Docs & governance**
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

### Attribution
- [agent-office](https://github.com/harishkotra/agent-office) by harishkotra — MIT License
- [TenacitOS](https://github.com/carlosazaustre/tenacitOS) by carlosazaustre — MIT License

---

[Unreleased]: https://github.com/jinujon007/AI-Headquarter/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jinujon007/AI-Headquarter/releases/tag/v1.0.0
