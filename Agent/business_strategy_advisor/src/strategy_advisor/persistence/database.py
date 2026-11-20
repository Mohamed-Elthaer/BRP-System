"""Database setup for the standalone persistence layer (SQLite by default)."""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core.config import get_settings

_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        url = get_settings().resolved_database_url()
        _engine = create_engine(url, future=True)
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)
    return _SessionLocal


def init_db() -> None:
    from .models import Base
    Base.metadata.create_all(bind=get_engine())