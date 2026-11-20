"""MCP-related models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class McpServerConfig(BaseModel):
    server_id: str
    provider: str
    transport: str = "http"  # http | stdio | sse
    endpoint: Optional[str] = None
    command: Optional[str] = None
    args: List[str] = Field(default_factory=list)
    auth_method: str = "none"  # none | bearer | oauth
    api_key: Optional[str] = None
    enabled_tools: List[str] = Field(default_factory=list)
    disabled_tools: List[str] = Field(default_factory=list)
    timeout_seconds: int = 20
    max_calls: int = 50
    max_response_bytes: int = 250000
    permitted_data_classification: str = "public"
    enabled: bool = True
    status: str = "configured"


class McpToolDescriptor(BaseModel):
    name: str
    description: str = ""
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    server_id: str


class McpToolCall(BaseModel):
    server_id: str
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    requested_at: datetime = Field(default_factory=datetime.utcnow)


class McpToolResult(BaseModel):
    server_id: str
    tool_name: str
    success: bool
    data: Any = None
    error: Optional[str] = None
    duration_ms: int = 0
    bytes_returned: int = 0
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)