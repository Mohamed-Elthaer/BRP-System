"""Research planning and query models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ResearchQuestion(BaseModel):
    question: str
    rationale: str = ""
    required: bool = True


class ResearchQuery(BaseModel):
    query: str
    provider: str = "tavily"
    tool: str = "search"
    arguments: Dict[str, Any] = Field(default_factory=dict)
    max_results: int = Field(default=5, ge=1, le=20)


class ResearchBudget(BaseModel):
    max_queries: int = 5
    max_pages: int = 8
    max_mcp_calls: int = 20
    max_bytes: int = 250000
    max_seconds: int = 45


class ResearchPlan(BaseModel):
    business_id: str
    objective: str
    necessity: str = "none"
    questions: List[ResearchQuestion] = Field(default_factory=list)
    queries: List[ResearchQuery] = Field(default_factory=list)
    budget: ResearchBudget = Field(default_factory=ResearchBudget)
    providers: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)