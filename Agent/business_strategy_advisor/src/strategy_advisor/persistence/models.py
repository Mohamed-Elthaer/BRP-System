"""SQLAlchemy models for business plans and tracking."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class BusinessPlanRecord(Base):
    __tablename__ = "business_plans"
    plan_id = Column(String(128), primary_key=True)
    business_id = Column(String(128), nullable=False, index=True)
    version = Column(String(16), default="1.0")
    status = Column(String(32), default="draft")
    objective = Column(String(64), nullable=False)
    plan_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime, nullable=True)


class ResearchSessionRecord(Base):
    __tablename__ = "research_sessions"
    session_id = Column(String(128), primary_key=True)
    business_id = Column(String(128), nullable=False, index=True)
    plan_id = Column(String(128), nullable=True)
    query_count = Column(Integer, default=0)
    source_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    session_json = Column(JSON, nullable=True)


class ActionProgressRecord(Base):
    __tablename__ = "action_progress"
    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(String(128), nullable=False, index=True)
    action_id = Column(String(64), nullable=False)
    status = Column(String(32), default="not_started")
    progress_pct = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KpiObservationRecord(Base):
    __tablename__ = "kpi_observations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(String(128), nullable=False, index=True)
    kpi_name = Column(String(128), nullable=False)
    value = Column(Float, nullable=True)
    observed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)