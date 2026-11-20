import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.domain import BusinessPlanningRequest, BusinessObjective, BusinessContext, BusinessEvidencePack, MetricValue
from strategy_advisor.domain.evidence import DataQuality
from datetime import datetime, timezone
from strategy_advisor.planning.financial_scenarios import build_scenarios


def _evidence():
    fm = {
        "revenue": MetricValue(name="revenue", value=42000.0, unit="EGP", period="last_30_days", source="mock"),
        "net_margin_pct": MetricValue(name="net_margin_pct", value=40.0, unit="percent", period="last_30_days", source="mock"),
        "waste_pct": MetricValue(name="waste_pct", value=4.2, unit="percent", period="last_30_days", source="mock"),
    }
    return BusinessEvidencePack(business_id="b1", generated_at=datetime.now(timezone.utc), financial_metrics=fm, data_quality=DataQuality(completeness=0.8))


class TestFinancial(unittest.TestCase):
    def test_scenarios(self):
        req = BusinessPlanningRequest(business_id="b1", owner_request="x", objective=BusinessObjective.INCREASE_PROFITABILITY, budget_amount=1000)
        ev = _evidence()
        sc = build_scenarios(req, ev, 1000)
        names = [s.name for s in sc]
        self.assertIn("baseline", names)
        self.assertIn("conservative", names)
        self.assertIn("expected", names)
        self.assertIn("optimistic", names)
        for s in sc:
            self.assertIsNotNone(s.confidence)


if __name__ == "__main__":
    unittest.main()