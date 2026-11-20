"""Business situation assessment from internal evidence."""

from __future__ import annotations

from typing import List

from ..domain import BusinessEvidencePack


def assess_situation(evidence: BusinessEvidencePack) -> dict:
    fm = evidence.financial_metrics
    revenue = fm.get("revenue").value if fm.get("revenue") else None
    net_margin = fm.get("net_margin_pct").value if fm.get("net_margin_pct") else None
    waste = fm.get("waste_pct").value if fm.get("waste_pct") else None
    low_stock = fm.get("low_stock_items").value if fm.get("low_stock_items") else None
    problems: List[str] = []
    if waste is not None and waste > 3:
        problems.append(f"Ingredient waste is {waste}% of usage, above a 3% target.")
    if low_stock is not None and low_stock > 0:
        problems.append(f"{int(low_stock)} ingredients are below minimum stock.")
    if net_margin is not None and net_margin < 15:
        problems.append(f"Net margin is {net_margin}%, which is low for a restaurant.")
    strengths: List[str] = []
    if net_margin is not None and net_margin >= 25:
        strengths.append("Healthy net margin.")
    if revenue is not None:
        strengths.append(f"Revenue of {revenue:,.0f} over the analysis period.")
    return {
        "revenue": revenue,
        "net_margin_pct": net_margin,
        "waste_pct": waste,
        "low_stock_items": low_stock,
        "problems": problems or ["No critical internal problems detected from available data."],
        "strengths": strengths or ["Insufficient data to identify strengths."],
    }