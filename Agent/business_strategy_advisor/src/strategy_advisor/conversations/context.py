"""Conversation context for follow-up questions."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class ConversationContext:
    def __init__(self) -> None:
        self.history: List[Dict[str, str]] = []
        self.last_plan_id: Optional[str] = None
        self.last_plan_summary: str = ""

    def add(self, role: str, content: str) -> None:
        self.history.append({"role": role, "content": content})
        if len(self.history) > 40:
            self.history = self.history[-40:]

    def set_plan(self, plan_id: str, summary: str) -> None:
        self.last_plan_id = plan_id
        self.last_plan_summary = summary

    def to_dict(self) -> Dict[str, Any]:
        return {"history": self.history, "last_plan_id": self.last_plan_id, "last_plan_summary": self.last_plan_summary}