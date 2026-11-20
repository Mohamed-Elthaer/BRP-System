"""Health route."""

from __future__ import annotations

from fastapi import APIRouter

from ..schemas import HealthResponse
from ...core.config import get_settings
from ...integrations.llm.client import LlmClient

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health():
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version=settings.service_version,
        bi_provider=settings.bi_provider,
        llm_available=LlmClient().available(),
    )