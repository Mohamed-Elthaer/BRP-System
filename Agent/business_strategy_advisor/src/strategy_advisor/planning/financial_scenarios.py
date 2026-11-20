"""Deterministic financial scenario calculations (LLM must not compute these)."""

from __future__ import annotations

from typing import List, Optional

from ..domain import BusinessEvidencePack, BusinessPlanningRequest, FinancialScenario


def _m(evidence, name):
    m = evidence.financial_metrics.get(name)
    return m.value if m else None


def build_scenarios(request, evidence, selected_option_cost: Optional[float] = None) -> List[FinancialScenario]:
    revenue = _m(evidence, "revenue") or 0.0
    net_margin = (_m(evidence, "net_margin_pct") or 0.0) / 100.0
    baseline_profit = revenue * net_margin
    waste = _m(evidence, "waste_pct") or 0.0
    cost = selected_option_cost or 0.0

    scenarios: List[FinancialScenario] = []

    # Baseline
    scenarios.append(FinancialScenario(
        name="baseline",
        assumptions=["Current revenue, margin and waste rates held constant."],
        incremental_revenue=0.0,
        incremental_contribution=0.0,
        implementation_cost=0.0,
        confidence=0.9,
        formula="baseline_profit = revenue * net_margin",
        sensitivity=["Revenue and margin assumptions."],
    ))

    # Conservative: 3% revenue lift, 1pt margin lift, waste -1pt
    cons_rev_lift = 0.03
    cons_margin_lift = 0.01
    cons_waste_save = revenue * (waste / 100.0) * 0.25
    inc_rev = revenue * cons_rev_lift
    inc_contrib = inc_rev * (net_margin + cons_margin_lift) + cons_waste_save - cost * 0.0
    scenarios.append(FinancialScenario(
        name="conservative",
        assumptions=["3% revenue lift", "1 percentage point margin lift", "25% of waste recovered", f"implementation cost {cost}"],
        incremental_revenue=round(inc_rev, 2),
        incremental_contribution=round(inc_contrib, 2),
        implementation_cost=cost,
        break_even_days=30 if cost else 0,
        payback_days=None,
        confidence=0.6,
        formula="inc_contrib = revenue*0.03*(net_margin+0.01) + revenue*(waste/100)*0.25 - cost",
        sensitivity=["Demand elasticity", "Cost of implementation"],
    ))

    # Expected: 8% revenue lift, 2pt margin, waste -40%
    exp_rev_lift = 0.08
    exp_margin_lift = 0.02
    exp_waste_save = revenue * (waste / 100.0) * 0.4
    inc_rev = revenue * exp_rev_lift
    inc_contrib = inc_rev * (net_margin + exp_margin_lift) + exp_waste_save
    scenarios.append(FinancialScenario(
        name="expected",
        assumptions=["8% revenue lift", "2 percentage points margin lift", "40% of waste recovered"],
        incremental_revenue=round(inc_rev, 2),
        incremental_contribution=round(inc_contrib, 2),
        implementation_cost=cost,
        break_even_days=45 if cost else 0,
        confidence=0.5,
        formula="inc_contrib = revenue*0.08*(net_margin+0.02) + revenue*(waste/100)*0.4",
        sensitivity=["Marketing effectiveness", "Pricing acceptance"],
    ))

    # Optimistic: 15% revenue lift, 3pt margin, waste -60%
    opt_rev_lift = 0.15
    opt_margin_lift = 0.03
    opt_waste_save = revenue * (waste / 100.0) * 0.6
    inc_rev = revenue * opt_rev_lift
    inc_contrib = inc_rev * (net_margin + opt_margin_lift) + opt_waste_save
    scenarios.append(FinancialScenario(
        name="optimistic",
        assumptions=["15% revenue lift", "3 percentage points margin lift", "60% of waste recovered"],
        incremental_revenue=round(inc_rev, 2),
        incremental_contribution=round(inc_contrib, 2),
        implementation_cost=cost,
        break_even_days=60 if cost else 0,
        confidence=0.35,
        formula="inc_contrib = revenue*0.15*(net_margin+0.03) + revenue*(waste/100)*0.6",
        sensitivity=["Best-case demand response", "Execution quality"],
    ))

    # payback estimate for cost-bearing scenarios
    for sc in scenarios:
        if sc.implementation_cost and sc.implementation_cost > 0 and sc.incremental_contribution and sc.incremental_contribution > 0:
            monthly = sc.incremental_contribution / max(request.planning_horizon_days / 30.0, 1)
            sc.payback_days = int(cost / (monthly / 30.0)) if monthly > 0 else None
    return scenarios