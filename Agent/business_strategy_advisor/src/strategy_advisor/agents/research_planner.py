"""Research planner agent (wraps deterministic planner)."""

from __future__ import annotations

from ..domain import BusinessPlanningRequest, ResearchPlan
from ..research.planner import build_research_plan, classify_research_necessity


class ResearchPlannerAgent:
    def plan(self, request, evidence_summary: str = "", budget=None) -> ResearchPlan:
        from ..domain import ResearchBudget
        if budget is None:
            budget = ResearchBudget()
        necessity = classify_research_necessity(request, evidence_summary)
        return build_research_plan(request, necessity, budget)