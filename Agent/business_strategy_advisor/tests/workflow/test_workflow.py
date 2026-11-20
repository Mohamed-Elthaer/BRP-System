import os, sys, unittest, asyncio
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.domain import BusinessPlanningRequest, BusinessObjective, BusinessContext
from strategy_advisor.application.use_cases.generate_plan import generate_plan


async def _run():
    req = BusinessPlanningRequest(business_id="b1", owner_request="increase profit by 20% in 90 days", objective=BusinessObjective.INCREASE_PROFITABILITY, budget_amount=5000, planning_horizon_days=90, location="Cairo", cuisine="Egyptian")
    ctx = BusinessContext(business_id="b1", restaurant_name="Test", location="Cairo", cuisine="Egyptian")
    plan = await generate_plan(req, ctx)
    return plan


class TestWorkflow(unittest.TestCase):
    def test_generate_plan(self):
        plan = asyncio.run(_run())
        self.assertTrue(plan.plan_id)
        self.assertTrue(plan.executive_summary)
        self.assertTrue(len(plan.roadmap_actions) > 0)
        self.assertTrue(len(plan.kpis) > 0)
        self.assertTrue(len(plan.financial_scenarios) >= 4)


if __name__ == "__main__":
    unittest.main()