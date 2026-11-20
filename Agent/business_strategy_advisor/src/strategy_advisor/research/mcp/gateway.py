"""Controlled MCP tool gateway."""

from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

from ...core.exceptions import ResearchError, ToolNotAllowedError
from ...core.logging import get_logger
from .models import McpServerConfig, McpToolCall, McpToolResult
from .registry import McpServerRegistry
from .transports import Transport

logger = get_logger("mcp.gateway")


class McpGateway:
    def __init__(self, registry: McpServerRegistry, transports: Optional[Dict[str, Transport]] = None) -> None:
        self.registry = registry
        self.transports = transports or {}
        self._call_counts: Dict[str, int] = {}

    def register_transport(self, server_id: str, transport: Transport) -> None:
        self.transports[server_id] = transport

    def discover_tools(self, server_id: str) -> List[dict]:
        cfg = self.registry.get(server_id)
        if cfg is None or not cfg.enabled:
            raise ToolNotAllowedError(f"server not available: {server_id}")
        transport = self.transports.get(server_id)
        if transport is None:
            return []
        return transport.discover_tools(cfg)

    def call(self, call: McpToolCall) -> McpToolResult:
        cfg = self.registry.get(call.server_id)
        if cfg is None:
            return McpToolResult(server_id=call.server_id, tool_name=call.tool_name, success=False, error="unknown server")
        if not cfg.enabled:
            return McpToolResult(server_id=call.server_id, tool_name=call.tool_name, success=False, error="server disabled")
        if not self.registry.is_tool_allowed(call.server_id, call.tool_name):
            return McpToolResult(server_id=call.server_id, tool_name=call.tool_name, success=False, error="tool not allowed")
        # budget
        key = call.server_id
        self._call_counts[key] = self._call_counts.get(key, 0) + 1
        if self._call_counts[key] > cfg.max_calls:
            return McpToolResult(server_id=call.server_id, tool_name=call.tool_name, success=False, error="call budget exceeded")
        # argument size guard
        try:
            arg_bytes = len(json.dumps(call.arguments).encode())
        except Exception:
            arg_bytes = 0
        if arg_bytes > cfg.max_response_bytes:
            return McpToolResult(server_id=call.server_id, tool_name=call.tool_name, success=False, error="arguments too large")
        transport = self.transports.get(call.server_id)
        if transport is None:
            return McpToolResult(server_id=call.server_id, tool_name=call.tool_name, success=False, error="no transport")
        logger.info("mcp call", extra={"provider": cfg.provider, "tool": call.tool_name})
        return transport.call_tool(cfg, call.tool_name, call.arguments)

    def reset_counts(self) -> None:
        self._call_counts.clear()