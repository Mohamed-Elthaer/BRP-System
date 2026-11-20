import os, sys, unittest, asyncio
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

os.environ.setdefault("STRATEGY_DATA_DIR", str(Path(__file__).resolve().parents[2] / "data_test"))


class TestApi(unittest.TestCase):
    def test_health_route(self):
        from strategy_advisor.api.routes.health import health
        import asyncio
        res = asyncio.run(health())
        self.assertEqual(res.status, "ok")

    def test_capabilities_route(self):
        from strategy_advisor.api.routes.research import capabilities
        res = asyncio.run(capabilities())
        self.assertTrue(len(res.endpoints) > 0)

    def test_generate_plan_usecase(self):
        from strategy_advisor.domain import BusinessPlanningRequest, BusinessObjective, BusinessContext
        from strategy_advisor.application.use_cases.generate_plan import generate_plan
        req = BusinessPlanningRequest(business_id="b1", owner_request="increase profit", objective=BusinessObjective.INCREASE_PROFITABILITY, planning_horizon_days=90)
        ctx = BusinessContext(business_id="b1", restaurant_name="Test")
        plan = asyncio.run(generate_plan(req, ctx))
        self.assertTrue(plan.plan_id)

    def test_list_plans_repo(self):
        from strategy_advisor.persistence.repositories import BusinessPlanRepository
        repo = BusinessPlanRepository()
        # ensure db initialized
        from strategy_advisor.persistence.database import init_db
        init_db()
        plans = repo.list_for_business("b1")
        self.assertIsInstance(plans, list)


if __name__ == "__main__":
    unittest.main()