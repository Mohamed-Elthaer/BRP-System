"""Input validation and sanitization helpers."""

from __future__ import annotations

import re
from typing import Any

from ..core.exceptions import StrategyAdvisorError


def validate_business_id(business_id: str) -> str:
    if not business_id or len(business_id) > 128:
        raise StrategyAdvisorError("invalid business_id")
    if not re.fullmatch(r"[A-Za-z0-9_\-\.]+", business_id):
        raise StrategyAdvisorError("business_id contains invalid characters")
    return business_id


def sanitize_text(text: str, max_len: int = 4000) -> str:
    text = text.strip()
    if len(text) > max_len:
        text = text[:max_len]
    # strip control chars
    text = "".join(ch for ch in text if ch == "\n" or ch == "\t" or ord(ch) >= 32)
    return text


def redact_secrets(obj: Any) -> Any:
    secret_keys = {"api_key", "secret", "password", "token", "authorization"}
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k.lower() in secret_keys:
                out[k] = "***REDACTED***"
            else:
                out[k] = redact_secrets(v)
        return out
    if isinstance(obj, list):
        return [redact_secrets(x) for x in obj]
    return obj