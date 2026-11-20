"""FastAPI dependencies."""

from __future__ import annotations

from fastapi import Header, HTTPException

from ..core.config import get_settings
from ..security.permissions import require_api_key


def api_key_dependency(x_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not require_api_key(x_api_key, settings.api_key, settings.require_auth):
        raise HTTPException(status_code=401, detail="Unauthorized")