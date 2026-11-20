"""MCP server registry (configuration-driven, not LLM-controlled)."""

from __future__ import annotations

from typing import Dict, List, Optional

from .models import McpServerConfig


class McpServerRegistry:
    def __init__(self) -> None:
        self._servers: Dict[str, McpServerConfig] = {}

    def register(self, cfg: McpServerConfig) -> None:
        self._servers[cfg.server_id] = cfg

    def get(self, server_id: str) -> Optional[McpServerConfig]:
        return self._servers.get(server_id)

    def list(self) -> List[McpServerConfig]:
        return list(self._servers.values())

    def enabled(self) -> List[McpServerConfig]:
        return [s for s in self._servers.values() if s.enabled]

    def is_tool_allowed(self, server_id: str, tool_name: str) -> bool:
        cfg = self.get(server_id)
        if cfg is None or not cfg.enabled:
            return False
        if cfg.disabled_tools and tool_name in cfg.disabled_tools:
            return False
        if cfg.enabled_tools:
            return tool_name in cfg.enabled_tools
        return True