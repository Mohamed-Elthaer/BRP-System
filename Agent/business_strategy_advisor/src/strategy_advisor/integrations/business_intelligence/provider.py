"""Factory for selecting a Business Evidence Provider."""

from __future__ import annotations

from ...core.config import get_settings
from .contracts import BusinessEvidenceProvider
from .http_adapter import HttpBusinessEvidenceProvider
from .mock_adapter import MockBusinessEvidenceProvider


def create_business_evidence_provider() -> BusinessEvidenceProvider:
    settings = get_settings()
    if settings.bi_provider == "http" and settings.bi_base_url:
        return HttpBusinessEvidenceProvider(settings.bi_base_url, settings.bi_timeout_seconds)
    return MockBusinessEvidenceProvider()