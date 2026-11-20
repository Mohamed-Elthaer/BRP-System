# LLM Reasoning Evaluation

## Implementation
`integrations/llm/client.py` uses Groq REST (`/openai/v1/chat/completions`) with configurable model. `agents/strategy_agent.py` calls it optionally and falls back to deterministic heuristics. All financial calculations remain deterministic in `planning/financial_scenarios.py`.

## Structured output compatibility
The implementation does not rely on native JSON Schema tool-calling together with structured output for Groq; it uses free-text completion appended to the rationale, and all authoritative outputs (plans, scenarios) are Pydantic-validated. This avoids model-specific structured-output limitations.

## Live verification
Blocked: no `GROQ_API_KEY` available. The LLM path returns `None` and the workflow proceeds deterministically. No mock response was treated as a real LLM result. The deterministic pipeline (20 tests) is the verified path.