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
