import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.domain import BusinessPlanningRequest, BusinessObjective
from strategy_advisor.planning.kpi import design_kpis
from strategy_advisor.planning.roadmap import build_roadmap
from strategy_advisor.planning.plan_validator import validate_plan
from strategy_advisor.domain import BusinessPlan, KPI
from strategy_advisor.domain.evidence import BusinessEvidencePack, DataQuality, MetricValue
from datetime import datetime, timezone


class TestPlanValidator(unittest.TestCase):
    def test_valid_plan(self):
        req = BusinessPlanningRequest(business_id="b1", owner_request="x", objective=BusinessObjective.INCREASE_PROFITABILITY)
        fm = {"revenue": MetricValue(name="revenue", value=1.0, source="m"), "net_margin_pct": MetricValue(name="net_margin_pct", value=10.0, source="m"), "waste_pct": MetricValue(name="waste_pct", value=2.0, source="m"), "low_stock_items": MetricValue(name="low_stock_items", value=0.0, source="m")}
        ev = BusinessEvidencePack(business_id="b1", generated_at=datetime.now(timezone.utc), financial_metrics=fm, data_quality=DataQuality(completeness=0.8), source_references=["src1"])
        from strategy_advisor.planning.strategy_options import generate_options
        analysis = generate_options(req, ev)
        actions = build_roadmap(analysis.recommended_option_id, 90)
        kpis = design_kpis(ev, 90)
        plan = BusinessPlan(plan_id="p1", business_id="b1", objective=req.objective.value, executive_summary="summary", selected_strategy=analysis.recommended_option_id, roadmap_actions=actions, kpis=kpis, assumptions=["a"], limitations=["l"], evidence_refs=["src1"])
        ok, issues = validate_plan(plan)
        self.assertTrue(ok, issues)

    def test_invalid_plan(self):
        plan = BusinessPlan(plan_id="p2", business_id="b1", objective="x", executive_summary="")
        ok, issues = validate_plan(plan)
        self.assertFalse(ok)
        self.assertTrue(len(issues) > 0)


if __name__ == "__main__":
    unittest.main()