"""Business planning request and related context models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from .enums import BusinessObjective, Language


class PlanningHorizon(BaseModel):
    days: int = Field(ge=1, le=3650)
    label: str = ""


class BusinessPlanningRequest(BaseModel):
    business_id: str = Field(min_length=1, max_length=128)
    owner_request: str = Field(min_length=1, max_length=4000)
    objective: BusinessObjective
    target_metric: Optional[str] = None
    target_value: Optional[float] = None
    planning_horizon_days: int = Field(default=90, ge=1, le=3650)
    budget_amount: Optional[float] = Field(default=None, ge=0)
    currency: str = Field(default="EGP", min_length=3, max_length=3)
    location: Optional[str] = None
    cuisine: Optional[str] = None
    operational_constraints: List[str] = Field(default_factory=list)
    owner_preferences: List[str] = Field(default_factory=list)
    language: Language = Language.EN
    extra: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("owner_request")
    @classmethod
    def strip_request(cls, v: str) -> str:
        return v.strip()


class BusinessContext(BaseModel):
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