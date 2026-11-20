"""Optional Brave Search provider interface."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ...core.config import get_settings


class BraveProvider:
    name = "brave"

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or get_settings().brave_api_key

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        if not self.is_configured():
            return []
        # Brave MCP/REST integration is optional and intentionally not activated by default.
        return []