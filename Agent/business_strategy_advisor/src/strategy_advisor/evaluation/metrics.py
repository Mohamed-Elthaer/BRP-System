"""Quality metrics for plans and evidence."""

from __future__ import annotations

from typing import List

from ..domain import BusinessPlan


def plan_completeness(plan: BusinessPlan) -> float:
    checks = [
        bool(plan.executive_summary),
        bool(plan.selected_strategy),
        bool(plan.roadmap_actions),
        bool(plan.kpis),
        bool(plan.evidence_refs),
        bool(plan.assumptions),
        bool(plan.limitations),
        bool(plan.financial_scenarios),
    ]
    return round(sum(1 for c in checks if c) / len(checks), 3)


def citation_coverage(plan: BusinessPlan) -> float:
    total = len(plan.roadmap_actions)
    if total == 0:
        return 0.0
    cited = sum(1 for a in plan.roadmap_actions if getattr(a, "evidence_refs", None))
    return round(cited / total, 3)