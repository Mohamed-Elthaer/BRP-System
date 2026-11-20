import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.domain import BusinessPlanningRequest, BusinessObjective, Language
from strategy_advisor.domain.evidence import MetricValue, BusinessEvidencePack


class TestDomain(unittest.TestCase):
    def test_request_validation(self):
        req = BusinessPlanningRequest(business_id="b1", owner_request="increase profit", objective=BusinessObjective.INCREASE_PROFITABILITY)
        self.assertEqual(req.planning_horizon_days, 90)
        self.assertEqual(req.language, Language.EN)

    def test_metric_value(self):
        m = MetricValue(name="revenue", value=100.0, unit="EGP")
        self.assertEqual(m.value, 100.0)

    def test_evidence_pack(self):
        from datetime import datetime, timezone
        pack = BusinessEvidencePack(business_id="b1", generated_at=datetime.now(timezone.utc))
        self.assertEqual(pack.version, "1.0")
        self.assertEqual(pack.source, "business_intelligence")


if __name__ == "__main__":
    unittest.main()