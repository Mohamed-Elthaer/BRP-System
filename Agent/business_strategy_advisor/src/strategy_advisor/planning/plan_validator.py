"""Independent plan validation (generator must not approve its own output)."""

from __future__ import annotations

from typing import List, Tuple

from ..domain import BusinessPlan


def validate_plan(plan: BusinessPlan) -> Tuple[bool, List[str]]:
    issues: List[str] = []
    if not plan.executive_summary:
        issues.append("missing_executive_summary")
    if not plan.selected_strategy:
        issues.append("missing_selected_strategy")
    if not plan.roadmap_actions:
        issues.append("empty_roadmap")
    if not plan.kpis:
        issues.append("missing_kpis")
    if not plan.evidence_refs:
        issues.append("missing_evidence_refs")
    # check action completeness
    for a in plan.roadmap_actions:
        if not getattr(a, "success_metric", None):
            issues.append(f"action_missing_success_metric:{a.action_id}")
        if not getattr(a, "evidence_refs", None):
            issues.append(f"action_missing_evidence:{a.action_id}")
    if not plan.assumptions:
        issues.append("missing_assumptions")
    if not plan.limitations:
        issues.append("missing_limitations")
    return (len(issues) == 0, issues)