"""End-to-end strategy workflow orchestrating evidence, research, analysis, planning."""

from __future__ import annotations

import time
from datetime import datetime
from typing import Optional

from ...agents.plan_reviewer import PlanReviewer
from ...agents.research_planner import ResearchPlannerAgent
from ...agents.strategy_agent import StrategyAgent
from ...core.logging import get_logger
from ...domain import BusinessContext, BusinessEvidencePack, BusinessPlanningRequest, BusinessPlan, ResearchEvidencePack
from ...domain.enums import PlanStatus
from ...intelligence.evidence_retrieval import retrieve_internal_evidence
from ...intelligence.opportunity import identify_opportunities
from ...intelligence.situation import assess_situation
from ...planning.financial_scenarios import build_scenarios
from ...planning.kpi import design_kpis
from ...planning.roadmap import build_roadmap
from ...research.evidence_extraction import extract_sources
from ...research.planner import ResearchBudget
from ...research.source_validation import score_source
from ...research.synthesis import synthesize

logger = get_logger("workflow")


class StrategyWorkflow:
    def __init__(self) -> None:
        self.strategy_agent = StrategyAgent()
        self.research_planner = ResearchPlannerAgent()
        self.reviewer = PlanReviewer()

    async def run(self, request: BusinessPlanningRequest, context: BusinessContext,
                 research_executor=None, revision_loops: int = 0) -> BusinessPlan:
        # 1. Internal evidence
        evidence = await retrieve_internal_evidence(request, context)
        situation = assess_situation(evidence)
        opportunities = identify_opportunities(evidence, None)

        # 2. Research necessity + plan
        evidence_summary = "; ".join(situation.get("problems", []))
        budget = ResearchBudget(max_queries=5, max_pages=8, max_mcp_calls=20)
        research_plan = self.research_planner.plan(request, evidence_summary, budget)

        research_evidence: Optional[ResearchEvidencePack] = None
        research_summary_text = ""
        if research_plan.necessity in ("required", "optional") and research_executor is not None:
            try:
                raw_results = await research_executor(research_plan)
                sources = extract_sources(raw_results, research_plan.queries[0].query if research_plan.queries else "")
                research_evidence = ResearchEvidencePack(
                    research_id=f"rs_{int(time.time())}",
                    business_id=request.business_id,
                    generated_at=datetime.utcnow(),
                    objective=request.objective.value,
                    queries=[q.query for q in research_plan.queries],
                    sources=sources,
                    summary="",
                    coverage_gaps=[],
                    confidence=round(sum(score_source(s) for s in sources) / max(len(sources), 1), 3) if sources else 0.0,
                )
                research_summary_text = synthesize(research_evidence)
                opportunities = identify_opportunities(evidence, research_evidence)
            except Exception as exc:
                logger.warning("research failed: %s", exc)
                research_evidence = ResearchEvidencePack(
                    research_id=f"rs_{int(time.time())}",
                    business_id=request.business_id,
                    generated_at=datetime.utcnow(),
                    objective=request.objective.value,
                    queries=[q.query for q in research_plan.queries],
                    sources=[],
                    summary="Research unavailable: " + str(exc),
                    coverage_gaps=["external research unavailable"],
                    confidence=0.0,
                )

        # 3. Strategy analysis
        analysis = self.strategy_agent.analyze(request, evidence, research_summary_text)

        # 4. Financial scenarios
        selected_cost = None
        if analysis.recommended_option_id:
            for o in analysis.options:
                if o.option_id == analysis.recommended_option_id:
                    selected_cost = o.implementation_cost
        scenarios = build_scenarios(request, evidence, selected_cost)

        # 5. Roadmap + KPIs
        horizon = request.planning_horizon_days
        selected = analysis.recommended_option_id or (analysis.options[0].option_id if analysis.options else "opt_balanced")
        actions = build_roadmap(selected, horizon)
        kpis = design_kpis(evidence, horizon)

        # 6. Build plan
        evidence_refs = list(evidence.source_references)
        if research_evidence:
            evidence_refs += [s.source_id for s in research_evidence.sources]

        plan = BusinessPlan(
            plan_id=f"plan_{request.business_id}_{int(time.time())}",
            business_id=request.business_id,
            objective=request.objective.value,
            executive_summary=f"Recommended strategy: {selected}. " + (analysis.rationale or ""),
            business_overview=f"Restaurant: {context.restaurant_name or request.business_id}; location: {context.location or request.location or 'unknown'}.",
            current_situation="; ".join(situation.get("problems", [])),
            internal_analysis=f"Revenue: {self._m(evidence,'revenue')}; net margin: {self._m(evidence,'net_margin_pct')}%; waste: {self._m(evidence,'waste_pct')}%.",
            external_analysis=research_summary_text or "No external research performed.",
            main_problems=situation.get("problems", []),
            opportunities=opportunities,
            competitor_analysis=research_summary_text,
            swot={
                "strengths": situation.get("strengths", []),
                "weaknesses": situation.get("problems", []),
                "opportunities": opportunities,
                "threats": ["Competitive pressure", "Cost inflation"],
            },
            strategic_options=[o.name for o in analysis.options],
            selected_strategy=selected,
            financial_scenarios=scenarios,
            roadmap_actions=actions,
            budget_requirements=f"Budget: {request.budget_amount} {request.currency}" if request.budget_amount is not None else "No explicit budget provided.",
            risks=[r for o in analysis.options for r in o.main_risks][:10],
            kpis=kpis,
            assumptions=["Internal evidence from Business Intelligence provider.", "External research used only when configured and available."],
            limitations=evidence.missing_data + (research_evidence.coverage_gaps if research_evidence else []),
            evidence_refs=evidence_refs,
        )

        # 7. Validation (bounded revision)
        reviewer = PlanReviewer()
        ok, issues = reviewer.review(plan)
        if not ok and revision_loops > 0:
            # single bounded attempt: append issues to limitations, do not loop
            plan.limitations = plan.limitations + [f"validation_issue:{i}" for i in issues]
            plan.status = PlanStatus.UNDER_REVIEW
        else:
            plan.status = PlanStatus.DRAFT
        return plan

    @staticmethod
    def _m(evidence, name):
        m = evidence.financial_metrics.get(name)
        return m.value if m else None