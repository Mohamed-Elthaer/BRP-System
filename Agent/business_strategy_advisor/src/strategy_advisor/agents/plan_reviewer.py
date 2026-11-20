"""Independent plan reviewer (validation stage)."""

from __future__ import annotations

from typing import List, Tuple

from ..domain import BusinessPlan
from ..planning.plan_validator import validate_plan


class PlanReviewer:
    def review(self, plan: BusinessPlan) -> Tuple[bool, List[str]]:
        return validate_plan(plan)