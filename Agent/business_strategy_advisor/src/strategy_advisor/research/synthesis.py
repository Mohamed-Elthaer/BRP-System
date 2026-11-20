"""Synthesize research evidence into a compact, validated summary."""

from __future__ import annotations

from typing import List

from ..domain import ResearchEvidencePack


def synthesize(evidence: ResearchEvidencePack) -> str:
    if not evidence.sources:
        return "No external sources were retrieved; analysis relies on internal evidence only."
    lines = [f"Retrieved {len(evidence.sources)} sources for: {evidence.objective}."]
    for s in evidence.sources[:6]:
        lines.append(f"- [{s.tier}] {s.title} ({s.url})")
    if evidence.coverage_gaps:
        lines.append("Coverage gaps: " + "; ".join(evidence.coverage_gaps))
    return "\n".join(lines)