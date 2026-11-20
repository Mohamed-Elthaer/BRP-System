"""Optional Google Places provider interface (advanced, not required)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ...core.config import get_settings


class PlacesProvider:
    name = "places"

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or get_settings().google_places_api_key

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def nearby(self, location: str, category: str, radius_m: int = 1000) -> List[Dict[str, Any]]:
        if not self.is_configured():
            return []
        return []  # Advanced integration; requires Places API + billing.