"""Business plan and KPI models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .enums import PlanStatus
from .strategies import StrategyAction


class KPI(BaseModel):
    name: str
    baseline: Optional[str] = None
    target: str
    measurement_frequency: str = "weekly"
    owner: str = "owner"
    evidence_refs: List[str] = Field(default_factory=list)


class FinancialScenario(BaseModel):
    name: str  # baseline/conservative/expected/optimistic
    assumptions: List[str] = Field(default_factory=list)
    incremental_revenue: Optional[float] = None
    incremental_contribution: Optional[float] = None
    implementation_cost: Optional[float] = None
    break_even_days: Optional[int] = None
    payback_days: Optional[int] = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    formula: str = ""
    sensitivity: List[str] = Field(default_factory=list)


class BusinessPlan(BaseModel):
    plan_id: str
    business_id: str
    version: str = "1.0"
    status: PlanStatus = PlanStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    objective: str
    executive_summary: str = ""
    business_overview: str = ""
    current_situation: str = ""
    internal_analysis: str = ""
    external_analysis: str = ""
    main_problems: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    competitor_analysis: str = ""
    swot: Dict[str, List[str]] = Field(default_factory=lambda: {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []})
    strategic_options: List[str] = Field(default_factory=list)
    selected_strategy: str = ""
    financial_scenarios: List[FinancialScenario] = Field(default_factory=list)
    roadmap_actions: List[StrategyAction] = Field(default_factory=list)
    budget_requirements: str = ""
    risks: List[str] = Field(default_factory=list)
    kpis: List[KPI] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    evidence_refs: List[str] = Field(default_factory=list)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    conversation_context: Dict[str, Any] = Field(default_factory=dict)