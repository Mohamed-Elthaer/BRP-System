"""API request/response schemas."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..domain import BusinessPlanningRequest, BusinessContext, BusinessPlan
from ..domain.enums import Language


class BusinessContextIn(BaseModel):
    business_id: str
    restaurant_name: Optional[str] = None
    location: Optional[str] = None
    business_model: Optional[str] = None
    cuisine: Optional[str] = None
    opening_hours: Optional[str] = None
    existing_goals: List[str] = Field(default_factory=list)
    available_resources: List[str] = Field(default_factory=list)
    known_constraints: List[str] = Field(default_factory=list)
    currency: str = "EGP"


class StrategyRequestIn(BaseModel):
    request: BusinessPlanningRequest
    context: BusinessContextIn
    research_executor_enabled: bool = False


class PlanResponse(BaseModel):
    plan: BusinessPlan


class PlanSummary(BaseModel):
    plan_id: str
    business_id: str
    status: str
    objective: str
    created_at: str


class ProviderStatus(BaseModel):
    name: str
    configured: bool
    details: Optional[str] = None


class ProviderStatusDetailed(BaseModel):
    name: str
    configured: bool
    connected: bool = False
    authenticated: bool = False
    available: bool = False
    mock_mode: bool = False
    last_success: Optional[str] = None
    last_error: Optional[str] = None


class CapabilitiesResponse(BaseModel):
    service: str
    version: str
    providers: List[ProviderStatus]
    endpoints: List[str]


class HealthResponse(BaseModel):
    status: str
    version: str
    bi_provider: str
    llm_available: bool