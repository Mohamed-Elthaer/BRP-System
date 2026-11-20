"""Plan evaluation helpers."""

from __future__ import annotations

from ..planning.plan_validator import validate_plan


def evaluate_plan(plan) -> dict:
    ok, issues = validate_plan(plan)
    return {"valid": ok, "issues": issues}