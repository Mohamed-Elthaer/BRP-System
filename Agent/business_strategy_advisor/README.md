# BRP Strategic Intelligence

Independent, evidence-driven restaurant business strategy advisor for BRP-System.

## What it is

A standalone FastAPI service that:
- Retrieves internal business evidence via a versioned `BusinessEvidenceProvider` contract (mock by default, HTTP adapter available).
- Decides whether external market research is needed and runs it through a controlled MCP gateway (Tavily primary, Brave/Places/Weather optional).
- Validates sources (tier, freshness, geography, corroboration).
- Generates multiple strategy options with transparent prioritization.
- Computes deterministic financial scenarios (conservative/expected/optimistic).
- Produces a structured business plan with a roadmap, KPIs, risks, assumptions and limitations.
- Persists plans and progress in an independent SQLite database.
- Exposes a REST API on port 8011 by default.

It never modifies the ERP database, never executes business operations, and never claims live connectivity while using mock data.

## Run

```powershell
cd D:\BRP-System\Agent\business_strategy_advisor
$env:PYTHONPATH = "src"
python scripts\run.py
```

Health: `http://127.0.0.1:8011/health`

## Tests

```powershell
$env:PYTHONPATH = "src"
python -m unittest discover -s tests -v
```

All 20 tests pass offline (no paid services required).

## Configuration

Copy `.env.example` to `.env` and edit. Key variables: `STRATEGY_PORT`, `GROQ_API_KEY`, `BI_PROVIDER`, `TAVILY_API_KEY`, `STRATEGY_API_KEY`, `STRATEGY_REQUIRE_AUTH`.

## Example request

```powershell
$body = @{ request = @{ business_id="b1"; owner_request="increase profit"; objective="increase_profitability"; planning_horizon_days=90; budget_amount=1000; location="Cairo"; cuisine="Egyptian" }; context = @{ business_id="b1"; restaurant_name="Test"; location="Cairo"; cuisine="Egyptian" } } | ConvertTo-Json -Depth 5
Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/strategy/generate-plan' -Method POST -Body $body -ContentType 'application/json'
```

## Module path

`D:\BRP-System\Agent\business_strategy_advisor`

## Isolation

No files outside this directory were modified. See `docs/ISOLATION_POLICY.md`.