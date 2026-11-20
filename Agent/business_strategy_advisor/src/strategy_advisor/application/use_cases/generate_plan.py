"""Use case: generate a business plan."""

from __future__ import annotations

from typing import Callable, Optional

from ...domain import BusinessContext, BusinessPlanningRequest, BusinessPlan
from ..workflows.strategy_workflow import StrategyWorkflow


async def generate_plan(request: BusinessPlanningRequest, context: BusinessContext,
                        research_executor: Optional[Callable] = None) -> BusinessPlan:
    workflow = StrategyWorkflow()
    return await workflow.run(request, context, research_executor=research_executor)