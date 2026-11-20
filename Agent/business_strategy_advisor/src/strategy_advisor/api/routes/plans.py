"""Plan management routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import api_key_dependency
from ..schemas import PlanSummary
from ...persistence.repositories import BusinessPlanRepository

router = APIRouter(dependencies=[Depends(api_key_dependency)])


@router.get("/v1/plans")
async def list_plans(business_id: str):
    repo = BusinessPlanRepository()
    plans = repo.list_for_business(business_id)
    return [{"plan_id": p.plan_id, "business_id": p.business_id, "status": p.status.value, "objective": p.objective, "created_at": p.created_at.isoformat()} for p in plans]


@router.get("/v1/plans/{plan_id}")
async def get_plan(plan_id: str):
    plan = BusinessPlanRepository().get(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("/v1/plans/{plan_id}/review")
async def review_plan(plan_id: str):
    from ...agents.plan_reviewer import PlanReviewer
    plan = BusinessPlanRepository().get(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    ok, issues = PlanReviewer().review(plan)
    return {"valid": ok, "issues": issues}


@router.post("/v1/plans/{plan_id}/approve")
async def approve_plan(plan_id: str, approved_by: str = "owner"):
    ok = BusinessPlanRepository().update_status(plan_id, "approved", approved_by=approved_by)
    if not ok:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"status": "approved", "plan_id": plan_id}


@router.post("/v1/plans/{plan_id}/progress")
async def record_progress(plan_id: str, action_id: str, status: str, progress_pct: float = 0.0, notes: str = ""):
    BusinessPlanRepository().record_progress(plan_id, action_id, status, progress_pct, notes)
    return {"status": "recorded"}


@router.post("/v1/plans/{plan_id}/evaluate")
async def evaluate_plan(plan_id: str):
    from ...evaluation.plan_eval import evaluate_plan as ev
    plan = BusinessPlanRepository().get(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return ev(plan)