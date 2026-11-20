"""Permission helpers for API access."""

from __future__ import annotations

from typing import Optional


def require_api_key(provided: Optional[str], expected: Optional[str], required: bool) -> bool:
    if not required:
        return True
    if not expected:
        return False
    return provided == expected