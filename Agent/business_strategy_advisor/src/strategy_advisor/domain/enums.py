"""Domain enumerations."""

from __future__ import annotations

from enum import Enum


class BusinessObjective(str, Enum):
    INCREASE_PROFITABILITY = "increase_profitability"
    INCREASE_REVENUE = "increase_revenue"
    IMPROVE_PRICING = "improve_pricing"
    IMPROVE_MENU_PROFITABILITY = "improve_menu_profitability"
    REDUCE_OPERATIONAL_EXPENSES = "reduce_operational_expenses"
    REDUCE_WASTE = "reduce_waste"
    IMPROVE_INVENTORY_EFFICIENCY = "improve_inventory_efficiency"
    RESEARCH_COMPETITORS = "research_competitors"
    EXPLORE_NEW_PRODUCTS = "explore_new_products"
    EVALUATE_MARKETING = "evaluate_marketing"
    IMPROVE_DELIVERY = "improve_delivery"
    EVALUATE_EXPANSION = "evaluate_expansion"
    ASSESS_RISK = "assess_risk"


class PlanStatus(str, Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EvidenceType(str, Enum):
    VERIFIED_FACT = "verified_fact"
    CALCULATED_METRIC = "calculated_metric"
    EXTERNAL_FINDING = "external_finding"
    HYPOTHESIS = "hypothesis"
    FORECAST = "forecast"
    ASSUMPTION = "assumption"
    RECOMMENDATION = "recommendation"


class SourceTier(str, Enum):
    A = "A"
    B = "B"
    C = "C"


class ResearchNecessity(str, Enum):
    NONE = "none"
    OPTIONAL = "optional"
    REQUIRED = "required"


class StrategyType(str, Enum):
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"


class Language(str, Enum):
    EN = "en"
    AR = "ar"