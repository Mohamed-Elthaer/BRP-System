# BRP Strategic Intelligence

Independent, evidence-driven restaurant business strategy advisor for BRP-System.

## What it is

A standalone FastAPI service that:

- Retrieves internal business evidence via a versioned `BusinessEvidenceProvider` contract (mock by default, HTTP adapter available).
- Decides whether external market research is needed and runs it through a controlled MCP gateway (Tavily primary, Brave/Places/Weather optional).
- Validates sources (tier, freshness, geography, corroboration) and sanitizes untrusted content.
- Generates multiple strategy options with transparent prioritization.
- Computes deterministic financial scenarios (conservative/expected/optimistic).
- Produces a structured business plan with a roadmap, KPIs, risks, assumptions and limitations.
- Persists plans and progress in an independent SQLite database.
- Exposes a REST API on port 8011 by default.

It never modifies the ERP database, never executes business operations, and never claims live connectivity while using mock data.

## Module path

`D:\BRP-System\Agent\business_strategy_advisor`

## Isolation

No files outside this directory were modified. See `docs/ISOLATION_POLICY.md`.

## Run

```powershell
cd D:\BRP-System\Agent\business_strategy_advisor
$env:PYTHONPATH = "src"
python scripts\run.py
```

Health: `http://127.0.0.1:8011/health`

## Tests

```powershell
cd D:\BRP-System\Agent\business_strategy_advisor
$env:PYTHONPATH = "src"
python -m unittest discover -s tests -v
```

All 22 tests pass offline (no paid services required).

## Configuration

Copy `.env.example` to `.env` and edit. Key variables:

| Variable | Purpose |
|---|---|
| `STRATEGY_PORT` | Service port (default 8011) |
| `STRATEGY_API_KEY` / `STRATEGY_REQUIRE_AUTH` | Optional API key auth |
| `GROQ_API_KEY` | Groq LLM (optional; deterministic fallback otherwise) |
| `BI_PROVIDER` / `BI_BASE_URL` | `mock` (default) or `http` adapter for a future BI service |
| `TAVILY_API_KEY` / `TAVILY_MCP_URL` | Primary external research (optional) |
| `BRAVE_API_KEY` / `GOOGLE_PLACES_API_KEY` | Optional research providers |
| `STRATEGY_DATA_DIR` | SQLite data directory (default `./data`) |

## How to use

### 1. Start the service

```powershell
cd D:\BRP-System\Agent\business_strategy_advisor
$env:PYTHONPATH = "src"
python scripts\run.py
```

Confirm it is up:

```powershell
curl http://127.0.0.1:8011/health
```

Expected:

```json
{"status":"ok","version":"0.1.0","bi_provider":"mock","llm_available":false}
```

### 2. Check capabilities and providers

```powershell
curl http://127.0.0.1:8011/v1/capabilities
curl http://127.0.0.1:8011/v1/providers/status
```

### 3. Generate a business plan (main workflow)

```powershell
$body = @{
  request = @{
    business_id = "b1"
    owner_request = "I want to increase my restaurant's profitability by 20% over the next 90 days with a limited budget."
    objective = "increase_profitability"
    planning_horizon_days = 90
    budget_amount = 5000
    currency = "EGP"
    location = "Cairo"
    cuisine = "Egyptian"
  }
  context = @{
    business_id = "b1"
    restaurant_name = "My Restaurant"
    location = "Cairo"
    cuisine = "Egyptian"
  }
} | ConvertTo-Json -Depth 5

Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/strategy/generate-plan' -Method POST -Body $body -ContentType 'application/json'
```

The response contains a `plan` object with:

- `executive_summary`, `current_situation`, `main_problems`, `opportunities`
- `swot` (strengths/weaknesses/opportunities/threats)
- `strategic_options`, `selected_strategy`, `financial_scenarios` (baseline/conservative/expected/optimistic)
- `roadmap_actions` (each with action_id, title, priority, target_day, success_metric, evidence_refs, risks)
- `kpis`, `risks`, `assumptions`, `limitations`, `evidence_refs`

### 4. Understand and analyze (without generating a full plan)

```powershell
# Parse/echo the request
Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/strategy/understand' -Method POST -Body $body -ContentType 'application/json'

# Internal evidence + situation + opportunities only
Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/strategy/analyze' -Method POST -Body $body -ContentType 'application/json'
```

### 5. Manage saved plans

```powershell
# List plans for a business
curl "http://127.0.0.1:8011/v1/plans?business_id=b1"

# Get a plan by id
curl "http://127.0.0.1:8011/v1/plans/<plan_id>"

# Validate a plan
Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/plans/<plan_id>/review' -Method POST

# Approve a plan
Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/plans/<plan_id>/approve?approved_by=owner' -Method POST

# Record action progress
Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/plans/<plan_id>/progress?action_id=A1&status=in_progress&progress_pct=25' -Method POST

# Evaluate a plan
Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/plans/<plan_id>/evaluate' -Method POST
```

### 6. Research and source inspection

```powershell
# Source lookup (stub; persistence of research sessions is documented as future work)
curl "http://127.0.0.1:8011/v1/research/sources/<research_id>"
```

### 7. Supported objectives

`increase_profitability`, `increase_revenue`, `improve_pricing`, `improve_menu_profitability`, `reduce_operational_expenses`, `reduce_waste`, `improve_inventory_efficiency`, `research_competitors`, `explore_new_products`, `evaluate_marketing`, `improve_delivery`, `evaluate_expansion`, `assess_risk`.

### 8. How the workflow behaves

1. Retrieve internal `BusinessEvidencePack` (mock by default; HTTP adapter when `BI_PROVIDER=http`).
2. Assess situation (revenue, margin, waste, low stock) and identify opportunities.
3. Classify research necessity (none / optional / required) from the objective and request text.
4. If research is required and an executor is provided, run bounded MCP research and validate sources.
5. Generate strategy options with transparent scoring weights.
6. Compute financial scenarios (baseline/conservative/expected/optimistic).
7. Build roadmap (7/30/60/90-day phases), KPIs, SWOT, risks.
8. Validate the plan (bounded; issues recorded in limitations if not fully valid).
9. Persist the plan to SQLite.

### 9. Important usage notes

- With `BI_PROVIDER=mock` (default), evidence is mock data sourced as `mock_business_intelligence`; plans record this in `evidence_source` and `limitations`. Do not treat mock figures as real restaurant data.
- Without a `GROQ_API_KEY`, the LLM path is skipped and the workflow proceeds deterministically. Plans are still complete and validated.
- Without research credentials, plans are internal-only and state the missing external evidence in `limitations`.
- All financial figures are computed deterministically in Python; the LLM never computes authoritative numbers.
- The service binds to `127.0.0.1` by default. Do not expose it to untrusted networks without enabling `STRATEGY_REQUIRE_AUTH` and setting `STRATEGY_API_KEY`.
- Plans are suggestions only; approving a plan does not execute any business operation.

## Example request

```powershell
$body = @{
  request = @{
    business_id = "b1"
    owner_request = "increase profit"
    objective = "increase_profitability"
    planning_horizon_days = 90
    budget_amount = 1000
    location = "Cairo"
    cuisine = "Egyptian"
  }
  context = @{
    business_id = "b1"
    restaurant_name = "Test"
    location = "Cairo"
    cuisine = "Egyptian"
  }
} | ConvertTo-Json -Depth 5

Invoke-WebRequest -Uri 'http://127.0.0.1:8011/v1/strategy/generate-plan' -Method POST -Body $body -ContentType 'application/json'
```

## Module path

`D:\BRP-System\Agent\business_strategy_advisor`

## Isolation

No files outside this directory were modified. See `docs/ISOLATION_POLICY.md`.