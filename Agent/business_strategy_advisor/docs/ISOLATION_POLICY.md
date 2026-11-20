# Isolation Policy

- New module lives at `D:\BRP-System\Agent\business_strategy_advisor\` (sibling of `Agent/backend`).
- No modification to `Backend/`, `frontend/`, `Agent/backend/`, `Agent/business_intelligence/`, existing env files, manifests, configs, or Git state.
- Own dependencies (`pyproject.toml`), env (`.env`), SQLite persistence, tests, docs.
- Business intelligence is consumed only through `BusinessEvidenceProvider` contract (`src/strategy_advisor/integrations/business_intelligence/contracts.py`).
- Mock provider is the default; HTTP adapter is available for future integration. Mock data is never represented as live ERP data.