"""Evidence evaluation helpers."""

from __future__ import annotations

from ..domain import BusinessPlan


def has_unsupported_claims(plan: BusinessPlan) -> bool:
    # Heuristic: if evidence_refs empty but roadmap present -> unsupported
    if plan.roadmap_actions and not plan.evidence_refs:
        return True
    return False