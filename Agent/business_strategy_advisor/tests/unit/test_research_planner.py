import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.domain import BusinessPlanningRequest, BusinessObjective
from strategy_advisor.research.planner import classify_research_necessity, build_research_plan
from strategy_advisor.domain import ResearchBudget


class TestResearchPlanner(unittest.TestCase):
    def test_internal_only(self):
        req = BusinessPlanningRequest(business_id="b1", owner_request="what was revenue yesterday", objective=BusinessObjective.INCREASE_PROFITABILITY)
        nec = classify_research_necessity(req)
        self.assertEqual(nec.value, "none")

    def test_external_required(self):
        req = BusinessPlanningRequest(business_id="b1", owner_request="compare competitor prices", objective=BusinessObjective.RESEARCH_COMPETITORS)
        nec = classify_research_necessity(req)
        self.assertEqual(nec.value, "required")
        plan = build_research_plan(req, nec, ResearchBudget())
        self.assertTrue(len(plan.queries) >= 1)
        self.assertIn("tavily", plan.providers)


if __name__ == "__main__":
    unittest.main()