"""Source reliability scoring and validation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import urlparse

from ..domain import ExternalSource, ResearchEvidencePack

TIER_A_DOMAINS = {"gov", "edu", "org"}
TIER_A_KEYWORDS = ["official", "government", "ministry", "statistics"]


def classify_tier(url: str, publisher: Optional[str] = None) -> str:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return "C"
    if any(host.endswith(f".{t}") for t in TIER_A_DOMAINS):
        return "A"
    pub = (publisher or "").lower()
    if any(k in pub for k in TIER_A_KEYWORDS):
        return "A"
    if any(k in host for k in ("reuters", "bloomberg", "ft.com", "wsj", "nytimes")):
        return "B"
    return "C"


def freshness_flag(published_at: Optional[datetime], retrieved_at: datetime, max_age_days: int = 730) -> str:
    if published_at is None:
        return "unknown_date"
    age = (retrieved_at - published_at).days
    if age < 0:
        return "future_date"
    if age > max_age_days:
        return "outdated"
    return "fresh"


def validate_source(src: ExternalSource, business_location: Optional[str] = None) -> List[str]:
    issues: List[str] = []
    if not src.url:
        issues.append("missing_url")
    if src.published_at is None:
        issues.append("missing_publication_date")
    if src.tier == "C":
        issues.append("low_reliability_source")
    if business_location and src.geographic_relevance and business_location.lower() not in src.geographic_relevance.lower():
        issues.append("geographic_mismatch")
    return issues


def score_source(src: ExternalSource) -> float:
    base = {"A": 0.9, "B": 0.7, "C": 0.4}.get(src.tier, 0.4)
    if src.published_at is None:
        base -= 0.1
    return max(0.0, min(1.0, base))