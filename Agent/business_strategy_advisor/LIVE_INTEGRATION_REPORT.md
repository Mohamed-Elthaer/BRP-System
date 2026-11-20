# Live Integration Report

Generated: 2026-11-20

## Capabilities classification

- Implemented and locally verified: domain models, planning, financial scenarios, plan validation, roadmap/KPIs, source validation, research planner, security sanitization, persistence (SQLite), FastAPI endpoints, MCP JSON-RPC protocol client, 22 unit/integration tests.
- Implemented but not live verified: Groq LLM reasoning (no API key), Tavily MCP live calls (no credentials), HTTP BI adapter (no BI service), Brave/Places/Weather providers.
- Partially implemented: Tavily provider uses MCP JSON-RPC when a server is configured; falls back to REST when API key present; returns empty otherwise.
- Missing: real BI service, real MCP server credentials, PydanticAI (not installed), live scenario evaluation.
- Blocked by credentials/external access: Groq, Tavily, Google Places, Brave, BI HTTP service.

## Commands and results
- `python -m unittest discover -s tests` → 22 tests, OK (1.69s).
- Service smoke test: `/health` returned `{"status":"ok","version":"0.1.0","bi_provider":"mock","llm_available":false}`; `/v1/strategy/generate-plan` returned plan with 5 actions, 4 scenarios, 4 KPIs.
- MCP protocol test: mock JSON-RPC server → discover_tools returned 1 tool; tools/call returned text; allowlist blocked disallowed tool.

## Live verification status
No live providers were reachable. All "live" results below are explicitly mock-based and labeled as such. No real results were fabricated.