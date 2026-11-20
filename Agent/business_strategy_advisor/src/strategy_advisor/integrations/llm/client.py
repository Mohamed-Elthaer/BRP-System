"""LLM client abstraction (Groq via REST, optional)."""

from __future__ import annotations

import json
import urllib.request
from typing import Any, Dict, Optional

from ...core.config import get_settings
from ...core.logging import get_logger

logger = get_logger("llm")


class LlmClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    def available(self) -> bool:
        return bool(self.settings.groq_api_key)

    def complete(self, system: str, user: str, temperature: float = 0.3, max_tokens: int = 1200) -> Optional[str]:
        if not self.available():
            return None
        try:
            payload = {
                "model": self.settings.groq_model,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.settings.groq_api_key}"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=self.settings.llm_timeout_seconds) as resp:
                data = json.loads(resp.read().decode())
            return (data.get("choices") or [{}])[0].get("message", {}).get("content")
        except Exception as exc:
            logger.warning("llm complete failed: %s", exc)
            return None