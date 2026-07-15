# AI HQ — Roadmap

What's planned, in rough order. No dates — items ship when they're solid. Open an issue to vote for or discuss any of these.

## v1.x — Hardening

Focus: make the current feature set boringly reliable.

- Stability of the core demo flow (CEO directive → delegation → output files)
- Better error surfacing in the dashboard when Ollama or a BYOK provider fails
- Test coverage across server and adapters
- Docs and deployment polish

## v2 — Planned Features

Deliberately cut from v1 to keep launch scope tight:

- **Terminal** — in-dashboard shell for agents (cut from v1 for security; needs proper sandboxing first)
- **Memory browser** — inspect and edit what agents remember
- **File browser** — browse `output/` from the dashboard
- **Global search** — search across tasks, messages, memories, and outputs
- **Voice mode** — talk to your PA
- **GitHub PR integration** — agents open pull requests
- **Multiple office floors** — more room as your team grows
- **Relationship graph** — visualize how agents collaborate

## Not planned

- Multi-tenancy. AI HQ is single-tenant by design — one instance per user.
