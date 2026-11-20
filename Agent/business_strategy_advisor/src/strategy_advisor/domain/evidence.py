"""Internal and external evidence models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MetricValue(BaseModel):
    name: str
    value: Optional[float] = None
    unit: Optional[str] = None
    period: Optional[str] = None
    source: str = "business_intelligence"
    formula: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class DataQuality(BaseModel):
    completeness: float = Field(default=0.0, ge=0.0, le=1.0)
    freshness_days: Optional[int] = None
    missing_fields: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


class BusinessEvidencePack(BaseModel):
    version: str = "1.0"
    business_id: str
    source: str = "business_intelligence"
    generated_at: datetime
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    financial_metrics: Dict[str, MetricValue] = Field(default_factory=dict)
    operational_metrics: Dict[str, MetricValue] = Field(default_factory=dict)
    risks: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    data_quality: DataQuality = Field(default_factory=DataQuality)
    missing_data: List[str] = Field(default_factory=list)
    source_references: List[str] = Field(default_factory=list)
    metric_definitions: Dict[str, str] = Field(default_factory=dict)


class ExternalClaim(BaseModel):
    claim: str
    supporting_excerpt: Optional[str] = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class ExternalSource(BaseModel):
    source_id: str
    title: str
    url: str
    publisher: Optional[str] = None
    published_at: Optional[datetime] = None
    retrieved_at: datetime
    geographic_relevance: Optional[str] = None
    classification: str = "web"
    tier: str = "C"
    claims: List[ExternalClaim] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    limitations: List[str] = Field(default_factory=list)
    content_hash: Optional[str] = None


class ResearchEvidencePack(BaseModel):
    research_id: str
    business_id: str
    generated_at: datetime
    objective: str
    queries: List[str] = Field(default_factory=list)
    sources: List[ExternalSource] = Field(default_factory=list)
    summary: Optional[str] = None
    coverage_gaps: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)