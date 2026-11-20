"""Strategy option generation and transparent prioritization."""

from __future__ import annotations

from typing import List

from ..domain import BusinessEvidencePack, BusinessPlanningRequest, StrategyAnalysis, StrategyOption, TradeOff
from ..domain.enums import StrategyType


def _metric(evidence, name):
    m = evidence.financial_metrics.get(name)
    return m.value if m else None


def generate_options(request, evidence, research_summary: str = "") -> StrategyAnalysis:
    revenue = _metric(evidence, "revenue") or 0.0
    net_margin = _metric(evidence, "net_margin_pct") or 0.0
    waste = _metric(evidence, "waste_pct") or 0.0

    problems = []
    if waste > 3:
        problems.append(f"Waste is {waste}% (target <=3%).")
    if net_margin < 15:
        problems.append(f"Net margin is {net_margin}% (target >=15%).")
    if not problems:
        problems.append("No critical internal problem detected; focus on growth and differentiation.")

    opportunities = list(evidence.opportunities or [])
    if research_summary:
        opportunities.append("External market context available for competitor and demand analysis.")

    options: List[StrategyOption] = []

    # Conservative: waste + portion control, low cost
    options.append(StrategyOption(
        option_id="opt_conservative",
        name="Cost & waste control",
        strategy_type=StrategyType.CONSERVATIVE.value,
        objective=request.objective.value,
        problem="; ".join(problems),
        opportunity="; ".join(opportunities) or "Operational efficiency",
        proposed_solution="Standardize portions, FIFO stock rotation, weekly waste tracking, and renegotiate top ingredient suppliers.",
        feasibility=0.85,
        expected_impact="Reduce waste and procurement cost; modest margin lift.",
        implementation_cost=0.0,
        required_effort="low",
        time_to_impact_days=30,
        main_risks=["Staff adherence", "Supplier resistance"],
        evidence_refs=["internal:waste_pct", "internal:low_stock_items"],
        score=0.0,
    ))

    # Balanced: pricing + menu mix
    options.append(StrategyOption(
        option_id="opt_balanced",
        name="Pricing and menu-mix optimization",
        strategy_type=StrategyType.BALANCED.value,
        objective=request.objective.value,
        problem="; ".join(problems),
        opportunity="; ".join(opportunities) or "Revenue optimization",
        proposed_solution="Reprice low-margin high-demand items, promote high-margin items, and bundle slow movers.",
        feasibility=0.7,
        expected_impact="Lift contribution margin per order without large demand loss.",
        implementation_cost=0.0,
        required_effort="medium",
        time_to_impact_days=45,
        main_risks=["Customer price sensitivity", "Demand elasticity unknown"],
        evidence_refs=["internal:net_margin_pct", "internal:avg_order_value"],
        score=0.0,
    ))

    # Aggressive: marketing + new products (only meaningful if budget provided)
    if request.budget_amount is not None:
        options.append(StrategyOption(
            option_id="opt_aggressive",
            name="Targeted marketing and new product launch",
            strategy_type=StrategyType.AGGRESSIVE.value,
            objective=request.objective.value,
            problem="; ".join(problems),
            opportunity="; ".join(opportunities) or "Growth",
            proposed_solution="Run a targeted campaign for low-demand hours and pilot one new high-margin product category.",
            feasibility=0.55,
            expected_impact="Revenue growth; higher risk and upfront spend.",
            implementation_cost=request.budget_amount,
            required_effort="high",
            time_to_impact_days=90,
            main_risks=["Marketing ROI uncertainty", "Kitchen capacity", "Budget overrun"],
            evidence_refs=["external:market_research"],
            score=0.0,
        ))

    # Transparent prioritization model
    weights = {"feasibility": 0.35, "impact": 0.35, "cost": 0.15, "speed": 0.15}
    impact_map = {"low": 0.3, "medium": 0.6, "high": 0.9}
    effort_cost = {"low": 1.0, "medium": 0.7, "high": 0.4}
    for opt in options:
        impact_score = impact_map.get(opt.required_effort, 0.6)
        cost_score = 1.0 if (opt.implementation_cost or 0) == 0 else max(0.2, 1.0 - (opt.implementation_cost / max(request.budget_amount or 1, 1)))
        speed_score = max(0.2, 1.0 - (opt.time_to_impact_days or 30) / 120.0)
        opt.score_breakdown = {
            "feasibility": round(opt.feasibility * weights["feasibility"], 3),
            "impact": round(impact_score * weights["impact"], 3),
            "cost": round(cost_score * weights["cost"], 3),
            "speed": round(speed_score * weights["speed"], 3),
        }
        opt.score = round(sum(opt.score_breakdown.values()), 3)

    options.sort(key=lambda o: o.score, reverse=True)
    recommended = options[0].option_id if options else None

    trade_offs = [
        TradeOff(decision="Price reduction vs contribution margin",
                 positive=["Higher volume"],
                 negative=["Lower per-unit margin"],
                 net_assessment="Only reduce prices where elasticity is proven by data."),
        TradeOff(decision="Marketing spend vs kitchen capacity",
                 positive=["Revenue growth"],
                 negative=["Potential service degradation"],
                 net_assessment="Cap campaign volume to kitchen throughput."),
    ]

    return StrategyAnalysis(
        business_id=request.business_id,
        objective=request.objective.value,
        problems=problems,
        opportunities=opportunities,
        trade_offs=trade_offs,
        options=options,
        recommended_option_id=recommended,
        rationale=f"Prioritization weights: {weights}. Scores are transparent and reproducible.",
    )