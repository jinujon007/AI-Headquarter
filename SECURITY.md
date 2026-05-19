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

- AI HQ is designed to run **locally only** — the server binds to `localhost:3001` by default
- The `output/` directory is sandboxed; agents write only there
- API keys are stored in browser localStorage only — never sent to AI HQ servers
- The terminal feature has been intentionally removed (see `CLAUDE.md`) due to security risk

When deploying publicly (Railway, etc.), you are responsible for securing the environment with `ADMIN_PASSWORD` and `AUTH_SECRET`.
