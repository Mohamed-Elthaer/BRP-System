"""Strategy option and trade-off models."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StrategyAction(BaseModel):
    action_id: str
    title: str
    problem_addressed: str
    description: str
    priority: str = "medium"
    start_day: int = 0
    target_day: int = 30
    effort: str = "medium"
    cost_estimate: Optional[float] = None
    responsible_role: str = "owner"
    dependencies: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    success_metric: str
    baseline: Optional[str] = None
    target: Optional[str] = None
    measurement_frequency: str = "weekly"
    evidence_refs: List[str] = Field(default_factory=list)


class StrategyOption(BaseModel):
    option_id: str
    name: str
    strategy_type: str
    objective: str
    problem: str
    opportunity: str
    proposed_solution: str
    feasibility: float = Field(ge=0.0, le=1.0)
    expected_impact: str
    implementation_cost: Optional[float] = None
    required_effort: str = "medium"
    time_to_impact_days: Optional[int] = None
    main_risks: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    evidence_refs: List[str] = Field(default_factory=list)
    score: float = 0.0
    score_breakdown: Dict[str, float] = Field(default_factory=dict)


class TradeOff(BaseModel):
    decision: str
    positive: List[str] = Field(default_factory=list)
    negative: List[str] = Field(default_factory=list)
    net_assessment: str


class StrategyAnalysis(BaseModel):
    business_id: str
    objective: str
    problems: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    trade_offs: List[TradeOff] = Field(default_factory=list)
    options: List[StrategyOption] = Field(default_factory=list)
    recommended_option_id: Optional[str] = None
    rationale: str = ""