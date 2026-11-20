"""Secret management helpers."""

from __future__ import annotations

import os

from ..core.config import get_settings


def mask(value: Optional[str]) -> str:
    if not value:
        return ""
    if len(value) <= 6:
        return "***"
    return value[:3] + "..." + value[-2:]