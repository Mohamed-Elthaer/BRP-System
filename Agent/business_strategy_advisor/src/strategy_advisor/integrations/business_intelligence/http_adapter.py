"""HTTP adapter for a future Business Intelligence service."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from ...core.config import get_settings
from ...core.exceptions import ProviderUnavailableError
from ...domain import BusinessContext, BusinessEvidencePack, BusinessPlanningRequest
from .contracts import BusinessEvidenceProvider


class HttpBusinessEvidenceProvider:
    provider_name = "http"
    contract_version = "1.0"

    def __init__(self, base_url: str, timeout: int = 15) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def health_check(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.base_url}/health", method="GET")
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return 200 <= resp.status < 300
        except Exception:
            return False

    async def get_evidence(self, request, context) -> BusinessEvidencePack:
        payload = {
            "business_id": request.business_id,
            "objective": request.objective.value,
            "period_days": request.planning_horizon_days,
            "context": context.model_dump(),
        }
        req = urllib.request.Request(
            f"{self.base_url}/v1/evidence",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as exc:
            raise ProviderUnavailableError(f"Business Intelligence unavailable: {exc}") from exc
        except Exception as exc:
            raise ProviderUnavailableError(f"Business Intelligence error: {exc}") from exc
        return BusinessEvidencePack.model_validate(data)