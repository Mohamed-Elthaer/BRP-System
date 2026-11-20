"""Roadmap generation helpers."""

from __future__ import annotations

from typing import List

from ..domain import StrategyAction


def build_roadmap(selected_option_id: str, horizon_days: int) -> List[StrategyAction]:
    phases = []
    if horizon_days >= 7:
        phases.append(("7-day", 7, [
            ("A1", "Baseline measurement", "Establish current metrics", "Record revenue, margin, waste and low-stock baseline.", "high"),
        ]))
    if horizon_days >= 30:
        phases.append(("30-day", 30, [
            ("A2", "Portion standardization", "Reduce waste", "Standardize recipes and portion sizes; train staff.", "high"),
            ("A3", "FIFO stock rotation", "Reduce waste", "Implement FIFO and weekly stock counts.", "medium"),
        ]))
    if horizon_days >= 60:
        phases.append(("60-day", 60, [
            ("A4", "Pricing review", "Improve margin", "Reprice low-margin high-demand items and promote high-margin items.", "medium"),
        ]))
    if horizon_days >= 90:
        phases.append(("90-day", 90, [
            ("A5", "Marketing pilot", "Increase revenue", "Run targeted promotion for low-demand hours.", "medium"),
        ]))

    actions: List[StrategyAction] = []
    for phase, target_day, items in phases:
        for aid, title, problem, desc, prio in items:
            actions.append(StrategyAction(
                action_id=aid,
                title=title,
                problem_addressed=problem,
                description=desc,
                priority=prio,
                start_day=0,
                target_day=min(target_day, horizon_days),
                effort="medium",
                cost_estimate=None,
                responsible_role="owner",
                dependencies=[],
                risks=["Execution risk", "Staff adoption"],
                success_metric="Measured against baseline KPIs",
                baseline="Current",
                target="Improved",
                measurement_frequency="weekly",
                evidence_refs=[f"strategy:{selected_option_id}"],
            ))
    return actions