"""Strategy generation routes."""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends

from ..dependencies import api_key_dependency
from ..schemas import PlanResponse, StrategyRequestIn
from ...application.use_cases.generate_plan import generate_plan
from ...domain import BusinessContext, BusinessPlanningRequest
from ...persistence.repositories import BusinessPlanRepository

router = APIRouter(dependencies=[Depends(api_key_dependency)])


@router.post("/v1/strategy/generate-plan", response_model=PlanResponse)
async def generate_plan_endpoint(payload: StrategyRequestIn):
    req = payload.request
    ctx = BusinessContext(**payload.context.model_dump())
    plan = await generate_plan(req, ctx)
    try:
        BusinessPlanRepository().save(plan)
    except Exception:
        pass
    return PlanResponse(plan=plan)


@router.post("/v1/strategy/understand")
async def understand(payload: StrategyRequestIn):
    req = payload.request
    return {"objective": req.objective.value, "horizon_days": req.planning_horizon_days, "budget": req.budget_amount, "location": req.location or payload.context.location}


@router.post("/v1/strategy/analyze")
async def analyze(payload: StrategyRequestIn):
    from ...intelligence.evidence_retrieval import retrieve_internal_evidence
    from ...intelligence.situation import assess_situation
    from ...intelligence.opportunity import identify_opportunities
    req = payload.request
    ctx = BusinessContext(**payload.context.model_dump())
    evidence = await retrieve_internal_evidence(req, ctx)
    situation = assess_situation(evidence)
    opps = identify_opportunities(evidence, None)
    return {"situation": situation, "opportunities": opps, "evidence_source": evidence.source}