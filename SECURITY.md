# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **jinujon007@gmail.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (optional)

You will receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible.

## Scope

The following are **in scope**:

- Remote code execution via the server API
- Authentication bypass in the dashboard
- Arbitrary file write outside the `output/` directory
- Injection vulnerabilities in agent tool execution

The following are **out of scope**:

- Vulnerabilities that require physical access to the machine
- Issues in Ollama itself (report upstream)
- Issues in third-party LLM providers (report upstream)

## Security Design Notes

- AI HQ is **single-tenant** and designed to run **locally** — the server binds to `localhost:3001` by default. One instance per user; do not share a hosted instance.
- The `output/` directory is sandboxed; agents write only there
- **BYOK API keys:** keys are stored in browser localStorage and sent per-request in the `x-api-key` header to **your own self-hosted server**, which forwards them to the LLM provider. They are never stored or logged server-side, and there is no third-party "AI HQ cloud" — the only server involved is the one you run.
- The terminal feature has been intentionally removed (see `CLAUDE.md`) due to security risk

### Hardening with `AIHQ_SERVER_KEY`

When `AIHQ_SERVER_KEY` is set in the server environment, the mutating endpoints (`POST /api/ceo/message`, `POST /api/agents/hire`) require a matching `x-aihq-key` header and return HTTP 401 otherwise. The dashboard injects this header server-side from its own environment, so the key is never exposed to the browser. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Leave it unset for local development (open mode). **Set it for any deployment reachable beyond localhost.**

When deploying publicly (Railway, etc.), you are responsible for securing the environment with `ADMIN_PASSWORD`, `AUTH_SECRET`, `ALLOWED_ORIGIN`, and `AIHQ_SERVER_KEY`.

## Known Dependency Advisories

`npm audit` is not clean, and we would rather say why than let you discover it. Audited
2026-07-31 — 45 advisories (0 critical, 33 high, 10 moderate, 2 low). What that actually
means here:

| Package | Severity | Status |
|---------|----------|--------|
| `next` | high | **No fixed version exists.** The advisory range covers every 16.x release; npm's only suggested "fix" is a downgrade to 9.3.3, which is not a fix. We track the latest patch (currently `16.2.12`) and will bump the moment upstream ships one. |
| `postcss`, `sharp` | high | Pinned transitively by `next`; unfixable until the item above is. Both are build/image-pipeline only — neither is reachable from agent input. |
| `minimatch`, `brace-expansion`, `glob`, `tar` (via `jest`, `eslint`, `ts-node-dev`) | high | **Dev-only** — not installed in production images and never executed by the running app. The available fixes are major downgrades of the test tooling itself (e.g. `jest@25`), which would break the suite. |
| `uuid` (via `colyseus`) | moderate | Fix requires `colyseus@0.17`, a breaking runtime upgrade. Tracked for v2. |

Fixed in the 2026-07-31 pass: `tar` (critical, arbitrary file write) via `sqlite3@6`;
dead `@monaco-editor/react` dependency removed entirely.

Because AI HQ runs **locally and single-tenant** by default, the practical exposure of
the remaining items is low: there is no untrusted multi-user traffic, and the dev-only
packages never run in a deployed instance. That is context, not a dismissal — if you can
demonstrate a real exploit path through any of these in a default install, please report
it (see above) and we will treat it as in scope.
