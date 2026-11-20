"""Internal evidence retrieval orchestration."""

from __future__ import annotations

from ..integrations.business_intelligence.provider import create_business_evidence_provider
from ..domain import BusinessContext, BusinessEvidencePack, BusinessPlanningRequest


async def retrieve_internal_evidence(request, context) -> BusinessEvidencePack:
    provider = create_business_evidence_provider()
    return await provider.get_evidence(request, context)