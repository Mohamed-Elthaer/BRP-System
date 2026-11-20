"""Mock Business Intelligence provider for development and testing."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict

from ...domain import (
    BusinessContext,
    BusinessEvidencePack,
    BusinessPlanningRequest,
    DataQuality,
    MetricValue,
)
from .contracts import BusinessEvidenceProvider


class MockBusinessEvidenceProvider:
    provider_name = "mock"
    contract_version = "1.0"

    def __init__(self, fixture: str = "restaurant_default") -> None:
        self.fixture = fixture

    async def health_check(self) -> bool:
        return True

    async def get_evidence(self, request, context) -> BusinessEvidencePack:
        now = datetime.now(timezone.utc)
        seed = int(hashlib.sha256(request.business_id.encode()).hexdigest()[:8], 16)
        base_revenue = 42000.0 + (seed % 5) * 3500
        metrics = {
            "revenue": MetricValue(name="revenue", value=round(base_revenue, 2), unit="EGP", period="last_30_days", source="mock_bi", formula="sum(paid order totals)"),
            "cogs": MetricValue(name="cogs", value=round(base_revenue * 0.38, 2), unit="EGP", period="last_30_days", source="mock_bi"),
            "gross_profit": MetricValue(name="gross_profit", value=round(base_revenue * 0.62, 2), unit="EGP", period="last_30_days", source="mock_bi"),
            "expenses": MetricValue(name="expenses", value=round(base_revenue * 0.22, 2), unit="EGP", period="last_30_days", source="mock_bi"),
            "net_profit": MetricValue(name="net_profit", value=round(base_revenue * 0.40, 2), unit="EGP", period="last_30_days", source="mock_bi"),
            "net_margin_pct": MetricValue(name="net_margin_pct", value=40.0, unit="percent", period="last_30_days", source="mock_bi"),
            "avg_order_value": MetricValue(name="avg_order_value", value=round(base_revenue / 320, 2), unit="EGP", period="last_30_days", source="mock_bi"),
            "order_count": MetricValue(name="order_count", value=320.0, unit="orders", period="last_30_days", source="mock_bi"),
            "waste_pct": MetricValue(name="waste_pct", value=4.2, unit="percent", period="last_30_days", source="mock_bi"),
            "low_stock_items": MetricValue(name="low_stock_items", value=6.0, unit="items", period="current", source="mock_bi"),
            "inventory_value": MetricValue(name="inventory_value", value=round(base_revenue * 0.18, 2), unit="EGP", period="current", source="mock_bi"),
        }
        return BusinessEvidencePack(
            business_id=request.business_id,
            source="mock_business_intelligence",
            generated_at=now,
            period_start=now - timedelta(days=30),
            period_end=now,
            financial_metrics=metrics,
            operational_metrics={
                "active_staff": MetricValue(name="active_staff", value=12.0, unit="people", period="current", source="mock_bi"),
                "kitchen_avg_prep_minutes": MetricValue(name="kitchen_avg_prep_minutes", value=18.5, unit="minutes", period="last_30_days", source="mock_bi"),
            },
            risks=["Ingredient waste above 4%", "Two low-margin menu categories", "Low-stock exposure on 6 ingredients"],
            opportunities=["Price optimization on high-demand items", "Reduce waste via portion control", "Promote high-margin items"],
            data_quality=DataQuality(completeness=0.85, freshness_days=1, missing_fields=["customer_segment", "delivery_share"], notes=["Mock fixture data"]),
            missing_data=["customer demographic breakdown", "delivery channel split"],
            source_references=["mock://business_intelligence/fixture"],
            metric_definitions={"revenue": "sum of paid order totals in period"},
        )