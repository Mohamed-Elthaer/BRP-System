"""Optional PydanticAI adapter (not required; used only if installed)."""

from __future__ import annotations

from typing import Optional

try:
    import pydantic_ai  # type: ignore
    PYDANTIC_AI_AVAILABLE = True
except Exception:
    pydantic_ai = None  # type: ignore
    PYDANTIC_AI_AVAILABLE = False


class PydanticAiClient:
    def __init__(self) -> None:
        self.available = PYDANTIC_AI_AVAILABLE

    def reason(self, system: str, user: str) -> Optional[str]:
        if not self.available:
            return None
        # PydanticAI + Groq requires groq + pydantic-ai packages and a key.
        # Intentionally not used as the default path; see docs/LLM_REASONING_EVALUATION.md.
        return None