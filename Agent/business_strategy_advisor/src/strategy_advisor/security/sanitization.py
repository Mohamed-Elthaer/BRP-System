"""Sanitize untrusted external content before it reaches the model."""

from __future__ import annotations

import re

INJECTION_PATTERNS = [
    r"ignore (all|previous) instructions",
    r"system prompt",
    r"you are now",
    r"disregard",
]


def sanitize_external_text(text: str) -> str:
    text = text or ""
    for pat in INJECTION_PATTERNS:
        text = re.sub(pat, "[redacted]", text, flags=re.IGNORECASE)
    return text[:4000]