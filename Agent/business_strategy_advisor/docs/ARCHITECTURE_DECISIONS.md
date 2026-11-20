# Architecture Decisions

- Python + FastAPI for the independent service.
- Pydantic for validation (PydanticAI/Groq optional; LLM client uses Groq REST with deterministic fallback).
- Provider-independent MCP gateway with allowlisted tools; mock transport for offline tests; HTTP transport for providers.
- Tavily primary research provider; Brave/Places/Weather optional interfaces.
- SQLite for standalone persistence (separate from ERP MongoDB).
- Deterministic financial calculations in Python; LLM never computes authoritative numbers.
- No LangGraph/swarm initially; single planning workflow with bounded revision loop.
- Research caching and budgets configurable via env.