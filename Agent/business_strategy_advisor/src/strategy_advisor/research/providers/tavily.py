"""Tavily research provider (primary). Uses MCP gateway with an allowlisted tool set."""

from __future__ import annotations

import json
import time
import urllib.request
from typing import Any, Dict, List, Optional

from ...core.config import get_settings
from ...core.exceptions import ProviderUnavailableError
from ...core.logging import get_logger
from ...research.mcp.gateway import McpGateway
from ...research.mcp.models import McpServerConfig, McpToolCall
from ...research.mcp.registry import McpServerRegistry

logger = get_logger("research.tavily")

# Allowlisted tools only. Real tool names verified at runtime via discover_tools.
ALLOWED_TOOLS = {"tavily-search", "tavily_search", "search", "tavily-extract", "tavily_extract", "extract"}


class TavilyProvider:
    name = "tavily"

    def __init__(self, gateway: McpGateway, server_id: str = "tavily", api_key: Optional[str] = None) -> None:
        self.gateway = gateway
        self.server_id = server_id
        self.api_key = api_key

    def is_configured(self) -> bool:
        return bool(self.api_key) or self.server_id in [s.server_id for s in self.gateway.registry.list()]

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        # Try MCP tool first
        for tool_name in ("tavily-search", "tavily_search", "search"):
            if self.gateway.registry.is_tool_allowed(self.server_id, tool_name):
                res = self.gateway.call(McpToolCall(server_id=self.server_id, tool_name=tool_name,
                                                   arguments={"query": query, "max_results": max_results}))
                if res.success:
                    return self._normalize_search(res.data, query)
        # REST fallback if API key present
        if self.api_key:
            return self._rest_search(query, max_results)
        logger.warning("tavily unavailable; returning empty", extra={"provider": "tavily"})
        return []

    def _rest_search(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        try:
            payload = json.dumps({"query": query, "max_results": max_results, "search_depth": "basic"}).encode()
            req = urllib.request.Request("https://api.tavily.com/search", data=payload,
                                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"}, method="POST")
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode())
            results = []
            for r in (data.get("results") or []):
                results.append({"title": r.get("title"), "url": r.get("url"), "content": r.get("content", ""), "score": r.get("score")})
            return results
        except Exception as exc:
            raise ProviderUnavailableError(f"Tavily REST failed: {exc}") from exc

    def _normalize_search(self, data: Any, query: str) -> List[Dict[str, Any]]:
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in ("results", "data", "items"):
                if isinstance(data.get(key), list):
                    return data[key]
        return [{"title": "result", "url": "", "content": str(data)}]

    async def extract(self, urls: List[str]) -> List[Dict[str, Any]]:
        for tool_name in ("tavily-extract", "tavily_extract", "extract"):
            if self.gateway.registry.is_tool_allowed(self.server_id, tool_name):
                res = self.gateway.call(McpToolCall(server_id=self.server_id, tool_name=tool_name, arguments={"urls": urls}))
                if res.success:
                    return res.data if isinstance(res.data, list) else [res.data]
        return []