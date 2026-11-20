"""Research routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import api_key_dependency
from ..schemas import CapabilitiesResponse, ProviderStatus
from ...core.config import get_settings
from ...research.mcp.gateway import McpGateway
from ...research.mcp.registry import McpServerRegistry

router = APIRouter(dependencies=[Depends(api_key_dependency)])


@router.get("/v1/research/sources/{research_id}")
async def get_sources(research_id: str):
    return {"research_id": research_id, "sources": [], "note": "source persistence not yet wired"}


@router.get("/v1/providers/status")
async def providers_status():
    settings = get_settings()
    return {
        "bi_provider": settings.bi_provider,
        "llm_available": bool(settings.groq_api_key),
        "tavily_configured": bool(settings.tavily_api_key or settings.tavily_mcp_url),
        "brave_configured": bool(settings.brave_api_key),
        "places_configured": bool(settings.google_places_api_key),
    }


@router.get("/v1/capabilities", response_model=CapabilitiesResponse)
async def capabilities():
    settings = get_settings()
    providers = [
        ProviderStatus(name="business_intelligence", configured=True, details=settings.bi_provider),
        ProviderStatus(name="llm", configured=bool(settings.groq_api_key), details=settings.groq_model),
        ProviderStatus(name="tavily", configured=bool(settings.tavily_api_key or settings.tavily_mcp_url)),
        ProviderStatus(name="brave", configured=bool(settings.brave_api_key)),
        ProviderStatus(name="places", configured=bool(settings.google_places_api_key)),
    ]
    endpoints = ["/health", "/v1/strategy/generate-plan", "/v1/strategy/understand", "/v1/strategy/analyze",
                 "/v1/plans", "/v1/plans/{plan_id}", "/v1/research/sources/{research_id}",
                 "/v1/providers/status", "/v1/capabilities"]
    return CapabilitiesResponse(service=settings.service_name, version=settings.service_version, providers=providers, endpoints=endpoints)