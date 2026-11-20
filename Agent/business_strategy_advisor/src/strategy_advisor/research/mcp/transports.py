"""MCP transports: mock, generic HTTP, and real MCP JSON-RPC (streamable HTTP)."""

from __future__ import annotations

import json
import time
import urllib.request
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from ...core.exceptions import ResearchError
from .models import McpServerConfig, McpToolResult


class Transport(ABC):
    @abstractmethod
    def discover_tools(self, cfg: McpServerConfig) -> List[dict]:
        ...

    @abstractmethod
    def call_tool(self, cfg: McpServerConfig, tool_name: str, arguments: Dict[str, Any]) -> McpToolResult:
        ...


class MockTransport(Transport):
    def __init__(self, tools=None, results=None) -> None:
        self.tools = tools or {}
        self.results = results or {}

    def discover_tools(self, cfg):
        return [{"name": n, "description": d.get("description", ""), "input_schema": d.get("input_schema", {})}
                for n, d in self.tools.items()]

    def call_tool(self, cfg, tool_name, arguments):
        start = time.time()
        if tool_name not in self.tools:
            return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=False, error="unknown tool")
        data = self.results.get(tool_name)
        if callable(data):
            data = data(arguments)
        if data is None:
            data = {"ok": True}
        return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=True, data=data,
                            duration_ms=int((time.time() - start) * 1000), bytes_returned=len(str(data).encode()))


class HttpTransport(Transport):
    """Generic HTTP transport (REST-style, not MCP protocol). Kept separate."""

    def discover_tools(self, cfg):
        return []

    def call_tool(self, cfg, tool_name, arguments):
        start = time.time()
        if not cfg.endpoint:
            return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=False, error="no endpoint")
        try:
            data = json.dumps({"tool": tool_name, "arguments": arguments}).encode()
            req = urllib.request.Request(cfg.endpoint, data=data, headers={"Content-Type": "application/json"}, method="POST")
            if cfg.api_key and cfg.auth_method == "bearer":
                req.add_header("Authorization", f"Bearer {cfg.api_key}")
            with urllib.request.urlopen(req, timeout=cfg.timeout_seconds) as resp:
                raw = resp.read(cfg.max_response_bytes + 1)
                if len(raw) > cfg.max_response_bytes:
                    raise ResearchError("response too large")
                parsed = json.loads(raw.decode("utf-8", errors="replace"))
                return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=True, data=parsed,
                                    duration_ms=int((time.time() - start) * 1000), bytes_returned=len(raw))
        except Exception as exc:
            return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=False, error=str(exc),
                                duration_ms=int((time.time() - start) * 1000))


class McpJsonRpcTransport(Transport):
    """Real MCP client over streamable HTTP (JSON-RPC 2.0).

    Implements initialize, notifications/initialized, tools/list, tools/call.
    """

    PROTOCOL_VERSION = "2024-11-05"

    def __init__(self, endpoint: str, api_key: Optional[str] = None, auth_method: str = "none", timeout: int = 20) -> None:
        self.endpoint = endpoint
        self.api_key = api_key
        self.auth_method = auth_method
        self.timeout = timeout
        self._req_id = 0
        self._initialized = False

    def _next_id(self) -> int:
        self._req_id += 1
        return self._req_id

    def _post(self, payload: dict) -> dict:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.endpoint, data=data, headers={"Content-Type": "application/json",
                                                                      "Accept": "application/json, text/event-stream"}, method="POST")
        if self.api_key and self.auth_method == "bearer":
            req.add_header("Authorization", f"Bearer {self.api_key}")
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            raw = resp.read(500000)
        text = raw.decode("utf-8", errors="replace")
        # handle SSE-framed responses
        if text.startswith("event:") or "\nevent:" in text:
            # extract last data: line
            data_lines = [ln[5:].strip() for ln in text.splitlines() if ln.startswith("data:")]
            text = data_lines[-1] if data_lines else "{}"
        return json.loads(text)

    def _initialize(self) -> None:
        if self._initialized:
            return
        payload = {"jsonrpc": "2.0", "id": self._next_id(), "method": "initialize",
                   "params": {"protocolVersion": self.PROTOCOL_VERSION,
                              "capabilities": {},
                              "clientInfo": {"name": "brp-strategic-intelligence", "version": "0.1.0"}}}
        resp = self._post(payload)
        if "error" in resp:
            raise ResearchError(f"mcp initialize error: {resp['error']}")
        # notification (no response expected)
        try:
            self._post({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})
        except Exception:
            pass
        self._initialized = True

    def discover_tools(self, cfg: McpServerConfig) -> List[dict]:
        self._initialize()
        payload = {"jsonrpc": "2.0", "id": self._next_id(), "method": "tools/list", "params": {}}
        resp = self._post(payload)
        if "error" in resp:
            raise ResearchError(f"mcp tools/list error: {resp['error']}")
        tools = (resp.get("result") or {}).get("tools", [])
        out = []
        for t in tools:
            out.append({"name": t.get("name"), "description": t.get("description", ""), "input_schema": t.get("inputSchema", {})})
        return out

    def call_tool(self, cfg: McpServerConfig, tool_name: str, arguments: Dict[str, Any]) -> McpToolResult:
        start = time.time()
        try:
            self._initialize()
            payload = {"jsonrpc": "2.0", "id": self._next_id(), "method": "tools/call",
                       "params": {"name": tool_name, "arguments": arguments}}
            resp = self._post(payload)
            if "error" in resp:
                return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=False,
                                    error=str(resp["error"]), duration_ms=int((time.time() - start) * 1000))
            result = resp.get("result") or {}
            is_error = bool(result.get("isError"))
            content = result.get("content", [])
            # flatten text content
            text_parts = []
            for c in content:
                if isinstance(c, dict) and c.get("type") == "text":
                    text_parts.append(c.get("text", ""))
                else:
                    text_parts.append(str(c))
            data = "\n".join(text_parts) if text_parts else result
            return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=not is_error, data=data,
                                error=("tool error" if is_error else None),
                                duration_ms=int((time.time() - start) * 1000), bytes_returned=len(str(data).encode()))
        except Exception as exc:
            return McpToolResult(server_id=cfg.server_id, tool_name=tool_name, success=False, error=str(exc),
                                duration_ms=int((time.time() - start) * 1000))