"""Repositories for business plans and tracking."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from .database import get_session_factory
from .models import ActionProgressRecord, BusinessPlanRecord, KpiObservationRecord, ResearchSessionRecord
from ..domain import BusinessPlan


class BusinessPlanRepository:
    def save(self, plan: BusinessPlan) -> None:
        session = get_session_factory()()
        try:
            rec = session.get(BusinessPlanRecord, plan.plan_id)
            if rec is None:
                rec = BusinessPlanRecord(plan_id=plan.plan_id, business_id=plan.business_id)
                session.add(rec)
            rec.business_id = plan.business_id
            rec.version = plan.version
            rec.status = plan.status.value
            rec.objective = plan.objective
            rec.plan_json = plan.model_dump(mode="json")
            rec.updated_at = datetime.utcnow()
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get(self, plan_id: str) -> Optional[BusinessPlan]:
        session = get_session_factory()()
        try:
            rec = session.get(BusinessPlanRecord, plan_id)
            if rec is None:
                return None
            return BusinessPlan.model_validate(rec.plan_json)
        finally:
            session.close()

    def list_for_business(self, business_id: str) -> List[BusinessPlan]:
        session = get_session_factory()()
        try:
            rows = session.query(BusinessPlanRecord).filter_by(business_id=business_id).order_by(BusinessPlanRecord.created_at.desc()).all()
            return [BusinessPlan.model_validate(r.plan_json) for r in rows]
        finally:
            session.close()

    def update_status(self, plan_id: str, status: str, approved_by: Optional[str] = None) -> bool:
        session = get_session_factory()()
        try:
            rec = session.get(BusinessPlanRecord, plan_id)
            if rec is None:
                return False
            rec.status = status
            if approved_by:
                rec.approved_by = approved_by
                rec.approved_at = datetime.utcnow()
            session.commit()
            return True
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def record_progress(self, plan_id: str, action_id: str, status: str, progress_pct: float = 0.0, notes: str = "") -> None:
        session = get_session_factory()()
        try:
            rec = ActionProgressRecord(plan_id=plan_id, action_id=action_id, status=status, progress_pct=progress_pct, notes=notes)
            session.add(rec)
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def record_kpi(self, plan_id: str, kpi_name: str, value: float, notes: str = "") -> None:
        session = get_session_factory()()
        try:
            rec = KpiObservationRecord(plan_id=plan_id, kpi_name=kpi_name, value=value, notes=notes)
            session.add(rec)
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()