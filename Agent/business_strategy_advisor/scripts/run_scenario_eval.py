import os, sys, asyncio, json
from pathlib import Path
SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))
os.environ.setdefault("STRATEGY_DATA_DIR", str(Path(__file__).resolve().parents[1] / "data_eval"))

from strategy_advisor.domain import BusinessPlanningRequest, BusinessObjective, BusinessContext
from strategy_advisor.application.use_cases.generate_plan import generate_plan
from strategy_advisor.intelligence.evidence_retrieval import retrieve_internal_evidence
from strategy_advisor.intelligence.situation import assess_situation

SCENARIOS = [
    ("S1", "Increase profitability by 20% in 90 days", BusinessObjective.INCREASE_PROFITABILITY, 90, 5000),
    ("S2", "Reduce food waste", BusinessObjective.REDUCE_WASTE, 60, 1000),
    ("S3", "Optimize menu prices vs competitors", BusinessObjective.IMPROVE_PRICING, 90, 2000),
    ("S4", "Improve low-demand hours", BusinessObjective.EVALUATE_MARKETING, 30, 1500),
    ("S5", "Evaluate new menu category", BusinessObjective.EXPLORE_NEW_PRODUCTS, 60, 3000),
    ("S6", "Compare conservative vs aggressive growth", BusinessObjective.INCREASE_REVENUE, 90, 4000),
    ("S7", "Assess expansion to another location", BusinessObjective.EVALUATE_EXPANSION, 180, 10000),
]

async def main():
    results = []
    for sid, desc, obj, horizon, budget in SCENARIOS:
        req = BusinessPlanningRequest(business_id="b1", owner_request=desc, objective=obj, planning_horizon_days=horizon, budget_amount=budget, location="Cairo", cuisine="Egyptian")
        ctx = BusinessContext(business_id="b1", restaurant_name="EvalRestaurant", location="Cairo", cuisine="Egyptian")
        evidence = await retrieve_internal_evidence(req, ctx)
        situation = assess_situation(evidence)
        plan = await generate_plan(req, ctx)
        results.append({
            "scenario_id": sid,
            "description": desc,
            "objective": obj.value,
            "actions": len(plan.roadmap_actions),
            "kpis": len(plan.kpis),
            "scenarios": [s.name for s in plan.financial_scenarios],
            "problems": situation["problems"],
            "selected_strategy": plan.selected_strategy,
            "evidence_source": evidence.source,
            "limitations": plan.limitations,
            "assumptions": plan.assumptions,
        })
    out = Path(__file__).resolve().parents[1] / "docs" / "SCENARIO_EVAL_RESULTS.json"
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())