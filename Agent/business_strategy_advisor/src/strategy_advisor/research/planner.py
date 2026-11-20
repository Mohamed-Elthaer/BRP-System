"""Research necessity decision and query planning."""

from __future__ import annotations

import re
from typing import List

from ..domain import BusinessPlanningRequest, ResearchBudget, ResearchPlan, ResearchQuery, ResearchQuestion
from ..domain.enums import ResearchNecessity

INTERNAL_ONLY_KEYWORDS = [
    "revenue", "sales", "profit", "waste", "inventory", "cost", "margin", "orders", " yesterday",
    "today", "last month", "internal",
]
EXTERNAL_KEYWORDS = [
    "competitor", "market", "trend", "new location", "expansion", "new product", "marketing",
    "pricing compare", "industry", "regulation", "supplier", "local market",
]


def classify_research_necessity(request: BusinessPlanningRequest, evidence_summary: str = "") -> ResearchNecessity:
    text = (request.owner_request + " " + (evidence_summary or "")).lower()
    if any(k in text for k in EXTERNAL_KEYWORDS):
        return ResearchNecessity.REQUIRED
    if request.objective.value in {"research_competitors", "explore_new_products", "evaluate_expansion", "evaluate_marketing"}:
        return ResearchNecessity.REQUIRED
    if request.objective.value in {"increase_profitability", "improve_pricing"} and "competitor" in text:
        return ResearchNecessity.OPTIONAL
    return ResearchNecessity.NONE


def build_research_plan(request: BusinessPlanningRequest, necessity: ResearchNecessity, budget: ResearchBudget) -> ResearchPlan:
    questions: List[ResearchQuestion] = []
    queries: List[ResearchQuery] = []
    providers: List[str] = []

    if necessity in (ResearchNecessity.REQUIRED, ResearchNecessity.OPTIONAL):
        providers.append("tavily")
        loc = request.location or "local market"
        cuisine = request.cuisine or "restaurant"
        questions.append(ResearchQuestion(question=f"What are typical {cuisine} restaurant prices and trends near {loc}?", rationale="Competitive positioning", required=True))
        questions.append(ResearchQuestion(question=f"What are current market conditions and consumer demand for {cuisine} dining?", rationale="Demand context", required=False))
        base_q = f"{cuisine} restaurant competitors prices {loc}"
        queries.append(ResearchQuery(query=base_q, provider="tavily", tool="search", max_results=5))
        if request.objective.value == "evaluate_expansion":
            queries.append(ResearchQuery(query=f"restaurant market density and opportunity {loc}", provider="tavily", tool="search", max_results=5))

    return ResearchPlan(
        business_id=request.business_id,
        objective=request.objective.value,
        necessity=necessity.value,
        questions=questions,
        queries=queries[:budget.max_queries],
        budget=budget,
        providers=providers,
    )