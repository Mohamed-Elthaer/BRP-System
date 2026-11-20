"""Opportunity identification from internal evidence and research."""

from __future__ import annotations

from typing import List

from ..domain import BusinessEvidencePack, ResearchEvidencePack


def identify_opportunities(evidence: BusinessEvidencePack, research: ResearchEvidencePack | None) -> List[str]:
    ops: List[str] = list(evidence.opportunities or [])
    fm = evidence.financial_metrics
    waste = fm.get("waste_pct").value if fm.get("waste_pct") else None
    if waste is not None and waste > 3:
        ops.append("Reduce waste through portion control and FIFO stock rotation.")
    if research and research.sources:
        ops.append("Validate competitor pricing against external market research before changing prices.")
    # de-duplicate while preserving order
    seen = set()
    out = []
    for o in ops:
        if o not in seen:
            seen.add(o)
            out.append(o)
    return out