"""Extract normalized claims and excerpts from raw research results."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from ..domain import ExternalClaim, ExternalSource
from .source_validation import classify_tier, freshness_flag, score_source


def extract_sources(raw_results: List[Dict[str, Any]], query: str) -> List[ExternalSource]:
    now = datetime.now(timezone.utc)
    out: List[ExternalSource] = []
    for i, r in enumerate(raw_results):
        url = r.get("url") or ""
        title = r.get("title") or f"Result {i+1}"
        content = r.get("content") or r.get("snippet") or ""
        src = ExternalSource(
            source_id=f"src_{i+1}",
            title=title,
            url=url,
            publisher=r.get("publisher"),
            retrieved_at=now,
            geographic_relevance=r.get("geographic_relevance"),
            classification="web",
            tier=classify_tier(url, r.get("publisher")),
            claims=[ExternalClaim(claim=content[:280], supporting_excerpt=content[:500], confidence=0.6)] if content else [],
            confidence=score_source(ExternalSource(source_id="x", title=title, url=url, retrieved_at=now, tier=classify_tier(url, r.get("publisher")))),
            limitations=[],
        )
        # freshness flag stored in limitations for transparency
        flag = freshness_flag(src.published_at, src.retrieved_at)
        if flag != "fresh":
            src.limitations.append(flag)
        out.append(src)
    return out