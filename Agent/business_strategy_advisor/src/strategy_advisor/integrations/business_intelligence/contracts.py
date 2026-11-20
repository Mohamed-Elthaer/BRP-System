"""Versioned Business Intelligence contract."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from ...domain import BusinessContext, BusinessEvidencePack, BusinessPlanningRequest


@runtime_checkable
class BusinessEvidenceProvider(Protocol):
    """Versioned contract for retrieving structured business evidence."""

    provider_name: str
    contract_version: str

    async def get_evidence(
        self, request: BusinessPlanningRequest, context: BusinessContext
    ) -> BusinessEvidencePack:
        ...

    async def health_check(self) -> bool:
        ...