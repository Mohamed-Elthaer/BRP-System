"""KPI design for a business plan."""

from __future__ import annotations

from typing import List

from ..domain import BusinessEvidencePack, KPI


def design_kpis(evidence: BusinessEvidencePack, horizon_days: int) -> List[KPI]:
    fm = evidence.financial_metrics
    waste = fm.get("waste_pct").value if fm.get("waste_pct") else None
    margin = fm.get("net_margin_pct").value if fm.get("net_margin_pct") else None
    low_stock = fm.get("low_stock_items").value if fm.get("low_stock_items") else None
    kpis: List[KPI] = []
    kpis.append(KPI(name="Net profit margin", baseline=f"{margin}%" if margin is not None else "unknown", target="Increase by >=2 percentage points", measurement_frequency="monthly"))
    kpis.append(KPI(name="Ingredient waste %", baseline=f"{waste}%" if waste is not None else "unknown", target="<=3%", measurement_frequency="weekly"))
    kpis.append(KPI(name="Low-stock incidents", baseline=f"{int(low_stock) if low_stock is not None else 'unknown'}", target="0", measurement_frequency="weekly"))
    kpis.append(KPI(name="Average order value", baseline="current", target="Increase by >=5%", measurement_frequency="weekly"))
    return kpis