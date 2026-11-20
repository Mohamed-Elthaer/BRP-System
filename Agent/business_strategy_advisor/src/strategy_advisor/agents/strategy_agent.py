"""Strategy synthesis agent (uses LLM optionally, falls back to deterministic)."""

from __future__ import annotations

from typing import Optional

from ..domain import BusinessPlanningRequest, StrategyAnalysis
from ..integrations.llm.client import LlmClient
from ..planning.strategy_options import generate_options


class StrategyAgent:
    def __init__(self) -> None:
        self.llm = LlmClient()

    def analyze(self, request, evidence, research_summary: str = "") -> StrategyAnalysis:
        analysis = generate_options(request, evidence, research_summary)
        if self.llm.available():
            system = "You are a restaurant business strategy advisor. Return a concise JSON object with keys: executive_note (string)."
            user = f"Objective: {request.objective.value}. Problems: {analysis.problems}. Options: {[o.name for o in analysis.options]}."
            note = self.llm.complete(system, user, temperature=0.2, max_tokens=200)
            if note:
                analysis.rationale = analysis.rationale + " LLM note: " + note[:400]
        return analysis