# Contributing to AI HQ

## Dev Setup

```bash
git clone <repo>
npm install
cp .env.example .env   # fill in ADMIN_PASSWORD + AUTH_SECRET
ollama pull llama3.2:3b
npm run dev            # starts server (3001) + dashboard (3000)
```

## Running Tests

Tests live in `apps/server` and `packages/adapters` (Jest):

```bash
cd apps/server && npx jest
cd packages/adapters && npx jest
```

Or via the workspace scripts: `npm test -w apps/server` and `npm test -w packages/adapters`. Run both before opening a PR — CI runs them too.

## Commit Messages

This repo uses [semantic-release](https://github.com/semantic-release/semantic-release) — versioning and the GitHub release are derived from commit messages. Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Groq streaming support        → minor release
fix: correct SSE parsing in AnthropicAdapter   → patch release
feat!: change adapter interface          → major release (breaking)
docs: / chore: / refactor: / test:       → no release
```

Commits that don't follow this format won't trigger a release. Use it for every commit on `main` (and for PR titles, so squashed merges stay conventional).

## Adding a New Agent

1. Open `apps/server/src/rooms/OfficeRoom.ts`
2. Call `setupCoreAgent(id, name, role, deskPosition)` in `onCreate()`
3. Add a desk position in `furnitureTargets`: `'<id>-desk': { x, y, type: 'desk' }`
4. Add the agent to the 3D scene: update `agentsConfig.ts` in `apps/dashboard/src/config/`

## Adding a New Tool

1. Open `apps/server/src/tools/ToolExecutor.ts`
2. Add a new case to the `execute()` switch
3. Declare the tool in the agent capabilities array in `OfficeRoom.ts`

## Adding a New LLM Adapter

1. Create `packages/adapters/src/YourAdapter.ts` implementing `InferenceAdapter` from `@aihq/core`
2. Export it from `packages/adapters/src/index.ts`
3. Add provider URL to `getAdapter()` in `OfficeRoom.ts`

## Architecture

See `CLAUDE.md` for full architecture documentation.

## License

MIT. Attribution required — see README.