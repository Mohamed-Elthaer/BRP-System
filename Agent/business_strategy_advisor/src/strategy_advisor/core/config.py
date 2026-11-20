"""Configuration for BRP Strategic Intelligence, loaded from environment variables."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field


def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    val = os.getenv(name)
    if val is None or str(val).strip() == "":
        return default
    return val


def _env_bool(name: str, default: bool = False) -> bool:
    v = _env(name)
    if v is None:
        return default
    return str(v).strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    v = _env(name)
    if v is None:
        return default
    try:
        return int(v)
    except ValueError:
        return default


class Settings(BaseModel):
    service_name: str = "brp-strategic-intelligence"
    service_version: str = "0.1.0"
    host: str = Field(default_factory=lambda: _env("STRATEGY_HOST", "127.0.0.1"))
    port: int = Field(default_factory=lambda: _env_int("STRATEGY_PORT", 8011))

    # LLM
    llm_provider: str = Field(default_factory=lambda: _env("LLM_PROVIDER", "groq"))
    groq_api_key: Optional[str] = Field(default_factory=lambda: _env("GROQ_API_KEY"))
    groq_model: str = Field(default_factory=lambda: _env("GROQ_MODEL", "llama-3.3-70b-versatile"))
    groq_fast_model: Optional[str] = Field(default_factory=lambda: _env("GROQ_FAST_MODEL"))
    llm_timeout_seconds: int = Field(default_factory=lambda: _env_int("LLM_TIMEOUT_SECONDS", 60))

    # MCP / research
    tavily_api_key: Optional[str] = Field(default_factory=lambda: _env("TAVILY_API_KEY"))
    tavily_mcp_url: Optional[str] = Field(default_factory=lambda: _env("TAVILY_MCP_URL"))
    brave_api_key: Optional[str] = Field(default_factory=lambda: _env("BRAVE_API_KEY"))
    google_places_api_key: Optional[str] = Field(default_factory=lambda: _env("GOOGLE_PLACES_API_KEY"))

    # Business Intelligence adapter
    bi_provider: str = Field(default_factory=lambda: _env("BI_PROVIDER", "mock"))
    bi_base_url: Optional[str] = Field(default_factory=lambda: _env("BI_BASE_URL"))
    bi_timeout_seconds: int = Field(default_factory=lambda: _env_int("BI_TIMEOUT_SECONDS", 15))

    # Research budgets
    max_research_queries: int = Field(default_factory=lambda: _env_int("MAX_RESEARCH_QUERIES", 5))
    max_extracted_pages: int = Field(default_factory=lambda: _env_int("MAX_EXTRACTED_PAGES", 8))
    max_mcp_calls: int = Field(default_factory=lambda: _env_int("MAX_MCP_CALLS", 20))
    max_response_bytes: int = Field(default_factory=lambda: _env_int("MAX_RESPONSE_BYTES", 250000))
    max_research_seconds: int = Field(default_factory=lambda: _env_int("MAX_RESEARCH_SECONDS", 45))
    research_cache_ttl_seconds: int = Field(default_factory=lambda: _env_int("RESEARCH_CACHE_TTL_SECONDS", 3600))
    research_cache_enabled: bool = Field(default_factory=lambda: _env_bool("RESEARCH_CACHE_ENABLED", True))

    # Persistence
    data_dir: Path = Field(default_factory=lambda: Path(_env("STRATEGY_DATA_DIR", "./data")))
    database_url: Optional[str] = Field(default_factory=lambda: _env("STRATEGY_DATABASE_URL"))

    # Auth / security
    api_key: Optional[str] = Field(default_factory=lambda: _env("STRATEGY_API_KEY"))
    require_auth: bool = Field(default_factory=lambda: _env_bool("STRATEGY_REQUIRE_AUTH", False))
    allow_live_providers: bool = Field(default_factory=lambda: _env_bool("ALLOW_LIVE_PROVIDERS", False))

    # Limits
    max_plan_actions: int = Field(default_factory=lambda: _env_int("MAX_PLAN_ACTIONS", 40))
    max_revision_loops: int = Field(default_factory=lambda: _env_int("MAX_REVISION_LOOPS", 2))

    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{(self.data_dir / 'strategy_advisor.db').resolve().as_posix()}"

    def has_groq(self) -> bool:
        return bool(self.groq_api_key)

    def has_tavily(self) -> bool:
        return bool(self.tavily_api_key or self.tavily_mcp_url)


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings() -> None:
    global _settings
    _settings = None