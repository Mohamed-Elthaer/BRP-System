"""
mongo_engine.py — Read-only MongoDB Analytics Engine for BRP Restaurant ERP.
Replaces the old SQLite demo engine and reads live data from MongoDB Atlas
using the exact same calculation rules as Backend/src/services/reportService.js.
"""

import os
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

from bson import ObjectId
from pymongo import MongoClient


def round2(n: Optional[float]) -> float:
    return round(float(n or 0), 2)


def pct_change(cur: float, prev: float) -> Optional[float]:
    if not prev:
        return None
    return round2(((cur - prev) / abs(prev)) * 100)


def to_json(val: Any) -> Any:
    if isinstance(val, ObjectId):
        return str(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, dict):
        return {k: to_json(v) for k, v in val.items()}
    if isinstance(val, list):
        return [to_json(v) for v in val]
    return val


class MongoERPEngine:
    def __init__(self, mongo_url: Optional[str] = None, db_name: Optional[str] = None):
        self.mongo_url = mongo_url or os.getenv("MONGO_URL")
        if not self.mongo_url:
            raise RuntimeError("MONGO_URL environment variable is not set")
        self.client = MongoClient(self.mongo_url, serverSelectionTimeoutMS=5000)
        if db_name:
            self.db = self.client[db_name]
        else:
            default_db = self.client.get_default_database()
            self.db = default_db if default_db is not None else self.client["test"]

    def ping(self) -> bool:
        self.client.admin.command("ping")
        return True

    def get_settings(self) -> dict[str, Any]:
        doc = self.db.settings.find_one({"key": "main"}) or {}
        rest = doc.get("restaurant") or {}
        return {
            "restaurantName": rest.get("name") or "My Restaurant",
            "currency": doc.get("currency") or "EGP",
            "timezone": doc.get("timezone") or "Africa/Cairo",
            "taxEnabled": bool((doc.get("tax") or {}).get("enabled", True)),
            "taxRate": (doc.get("tax") or {}).get("rate", 14),
            "serviceChargeEnabled": bool((doc.get("serviceCharge") or {}).get("enabled", False)),
            "serviceChargeRate": (doc.get("serviceCharge") or {}).get("rate", 12),
        }

    def _tz(self, tz_name: str) -> ZoneInfo:
        try:
            return ZoneInfo(tz_name or "Africa/Cairo")
        except Exception:
            return ZoneInfo("UTC")

    def _today_ymd(self, tz_name: str) -> str:
        return datetime.now(self._tz(tz_name)).strftime("%Y-%m-%d")

    def _zoned_day_range(self, ymd: str, tz_name: str) -> tuple[datetime, datetime]:
        tz = self._tz(tz_name)
        dt = datetime.strptime(ymd, "%Y-%m-%d")
        start_local = datetime(dt.year, dt.month, dt.day, 0, 0, 0, tzinfo=tz)
        end_local = start_local + timedelta(days=1) - timedelta(milliseconds=1)
        return start_local.astimezone(dt_timezone.utc), end_local.astimezone(dt_timezone.utc)

    def _parse_range(
        self,
        from_date: Optional[str],
        to_date: Optional[str],
        tz_name: str,
        default_days: int = 30,
    ) -> tuple[datetime, datetime]:
        tz = self._tz(tz_name)
        if to_date:
            _, end = self._zoned_day_range(to_date[:10], tz_name)
        else:
            end = datetime.now(dt_timezone.utc)

        if from_date:
            start, _ = self._zoned_day_range(from_date[:10], tz_name)
        else:
            if default_days == 0:
                start, _ = self._zoned_day_range(self._today_ymd(tz_name), tz_name)
            else:
                local_end = end.astimezone(tz)
                start_local = (local_end - timedelta(days=default_days)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                start = start_local.astimezone(dt_timezone.utc)
        return start, end

    def _period_metrics(self, start: datetime, end: datetime) -> dict[str, Any]:
        cogs_expr = {
            "$sum": {
                "$map": {
                    "input": "$items",
                    "as": "i",
                    "in": {"$multiply": [{"$ifNull": ["$$i.cost", 0]}, "$$i.quantity"]},
                }
            }
        }
        sales = list(
            self.db.orders.aggregate(
                [
                    {"$match": {"paymentStatus": "paid", "paidAt": {"$gte": start, "$lte": end}}},
                    {
                        "$group": {
                            "_id": None,
                            "revenue": {"$sum": "$total"},
                            "paidOrders": {"$sum": 1},
                            "cogs": {"$sum": cogs_expr},
                        }
                    },
                ]
            )
        )
        counts = list(
            self.db.orders.aggregate(
                [
                    {"$match": {"createdAt": {"$gte": start, "$lte": end}}},
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                ]
            )
        )
        exp = list(
            self.db.expenses.aggregate(
                [
                    {"$match": {"date": {"$gte": start, "$lte": end}}},
                    {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
                ]
            )
        )

        s = sales[0] if sales else {"revenue": 0, "paidOrders": 0, "cogs": 0}
        by_status = {c["_id"]: c["count"] for c in counts}
        total_orders = sum(c["count"] for c in counts if c["_id"] != "cancelled")
        total_expenses = (exp[0]["total"] if exp else 0) or 0
        rev = float(s.get("revenue", 0) or 0)
        cogs = float(s.get("cogs", 0) or 0)
        paid_orders = int(s.get("paidOrders", 0) or 0)

        return {
            "revenue": round2(rev),
            "paidOrders": paid_orders,
            "totalOrders": total_orders,
            "cancelledOrders": int(by_status.get("cancelled", 0)),
            "avgOrderValue": round2(rev / paid_orders) if paid_orders else 0.0,
            "cogs": round2(cogs),
            "grossProfit": round2(rev - cogs),
            "expenses": round2(total_expenses),
            "netProfit": round2(rev - cogs - total_expenses),
        }

    # ─── 1. Business Overview ─────────────────────────────────────────────────
    def get_business_overview(
        self, from_date: Optional[str] = None, to_date: Optional[str] = None
    ) -> dict[str, Any]:
        settings = self.get_settings()
        tz = settings["timezone"]

        if not from_date and not to_date:
            t_start, t_end = self._zoned_day_range(self._today_ymd(tz), tz)
            m_start, m_end = self._parse_range(None, None, tz, default_days=30)
            today_metrics = self._period_metrics(t_start, t_end)
            month_metrics = self._period_metrics(m_start, m_end)
            y_start = t_start - timedelta(days=1)
            y_end = t_start - timedelta(milliseconds=1)
            yesterday_metrics = self._period_metrics(y_start, y_end)
            period_label = {"today": self._today_ymd(tz), "last30DaysFrom": m_start.isoformat()}
            current = today_metrics
            previous = yesterday_metrics
        else:
            start, end = self._parse_range(from_date, to_date, tz, default_days=30)
            span = end - start
            prev_from = start - span - timedelta(milliseconds=1)
            prev_to = start - timedelta(milliseconds=1)
            current = self._period_metrics(start, end)
            previous = self._period_metrics(prev_from, prev_to)
            month_metrics = None
            period_label = {"from": start.isoformat(), "to": end.isoformat()}

        change = {k: pct_change(current[k], previous[k]) for k in current}

        ongoing_agg = list(
            self.db.orders.aggregate(
                [
                    {"$match": {"status": {"$in": ["new", "preparing", "ready", "served"]}}},
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                ]
            )
        )
        ongoing = {o["_id"]: o["count"] for o in ongoing_agg}
        low_stock_count = len(self.get_inventory_status(only_low=True)["items"])
        sync_issues = self.db.syncoperations.count_documents({"status": {"$in": ["failed", "conflict"]}})

        out = {
            "restaurantName": settings["restaurantName"],
            "currency": settings["currency"],
            "timezone": tz,
            "period": period_label,
            "current": current,
            "previous": previous,
            "changePct": change,
            "ongoingOrders": ongoing,
            "ongoingTotal": sum(ongoing.values()),
            "lowStockCount": low_stock_count,
            "syncIssuesCount": sync_issues,
        }
        if month_metrics is not None:
            out["last30Days"] = month_metrics
        return to_json(out)

    # ─── 2. Sales Trend & Peak Hours ──────────────────────────────────────────
    def get_sales_trend(self, days: int = 14, group_by: str = "day") -> dict[str, Any]:
        settings = self.get_settings()
        tz = settings["timezone"]
        days = max(1, min(int(days or 14), 90))
        start, end = self._parse_range(None, None, tz, default_days=days)

        match = {"paymentStatus": "paid", "paidAt": {"$gte": start, "$lte": end}}
        if group_by == "hour":
            group_id = {"$dateToString": {"format": "%H:00", "date": "$paidAt", "timezone": tz}}
            sort_stage = {"$sort": {"revenue": -1}}
        elif group_by == "order_type":
            group_id = "$orderType"
            sort_stage = {"$sort": {"revenue": -1}}
        else:
            group_id = {"$dateToString": {"format": "%Y-%m-%d", "date": "$paidAt", "timezone": tz}}
            sort_stage = {"$sort": {"_id": 1}}

        rows = list(
            self.db.orders.aggregate(
                [
                    {"$match": match},
                    {"$group": {"_id": group_id, "revenue": {"$sum": "$total"}, "orders": {"$sum": 1}}},
                    sort_stage,
                ]
            )
        )
        return to_json(
            {
                "currency": settings["currency"],
                "days": days,
                "groupBy": group_by,
                "series": [
                    {"bucket": r["_id"], "revenue": round2(r["revenue"]), "orders": r["orders"]}
                    for r in rows
                ],
            }
        )

    # ─── 3. Orders List ───────────────────────────────────────────────────────
    def get_orders(
        self,
        status: str = "all",
        order_type: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        limit: int = 15,
    ) -> dict[str, Any]:
        settings = self.get_settings()
        tz = settings["timezone"]
        limit = max(1, min(int(limit or 15), 30))

        query: dict[str, Any] = {}
        if status == "active":
            query["status"] = {"$in": ["new", "preparing", "ready", "served"]}
        elif status and status != "all":
            query["status"] = status

        if order_type in {"dine_in", "takeaway", "delivery"}:
            query["orderType"] = order_type

        if from_date or to_date:
            start, end = self._parse_range(from_date, to_date, tz, default_days=7)
            query["createdAt"] = {"$gte": start, "$lte": end}

        docs = list(
            self.db.orders.find(
                query,
                {
                    "orderNumber": 1,
                    "orderType": 1,
                    "status": 1,
                    "paymentStatus": 1,
                    "paymentMethod": 1,
                    "total": 1,
                    "discount": 1,
                    "tableNumber": 1,
                    "customerName": 1,
                    "cancelReason": 1,
                    "items": 1,
                    "createdAt": 1,
                    "preparingAt": 1,
                    "readyAt": 1,
                },
            )
            .sort("createdAt", -1)
            .limit(limit)
        )

        status_counts = list(
            self.db.orders.aggregate(
                [
                    {"$match": {k: v for k, v in query.items() if k != "status"}},
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                ]
            )
        )

        orders_out = []
        for d in docs:
            prep_mins = None
            if d.get("preparingAt") and d.get("readyAt"):
                prep_mins = round2((d["readyAt"] - d["preparingAt"]).total_seconds() / 60)
            orders_out.append(
                {
                    "orderNumber": d.get("orderNumber"),
                    "orderType": d.get("orderType"),
                    "status": d.get("status"),
                    "paymentStatus": d.get("paymentStatus"),
                    "paymentMethod": d.get("paymentMethod"),
                    "total": round2(d.get("total", 0)),
                    "tableNumber": d.get("tableNumber"),
                    "customerName": d.get("customerName"),
                    "cancelReason": d.get("cancelReason"),
                    "prepMinutes": prep_mins,
                    "items": [
                        {"name": i.get("name"), "qty": i.get("quantity"), "price": i.get("price")}
                        for i in (d.get("items") or [])
                    ],
                    "createdAt": d.get("createdAt"),
                }
            )

        return to_json(
            {
                "currency": settings["currency"],
                "filter": {"status": status, "orderType": order_type},
                "statusBreakdown": {s["_id"]: s["count"] for s in status_counts},
                "count": len(orders_out),
                "orders": orders_out,
            }
        )

    # ─── 4. Menu Performance & Profit Margins ─────────────────────────────────
    def get_menu_performance(self, days: int = 30) -> dict[str, Any]:
        settings = self.get_settings()
        tz = settings["timezone"]
        days = max(1, min(int(days or 30), 180))
        start, end = self._parse_range(None, None, tz, default_days=days)

        sold = list(
            self.db.orders.aggregate(
                [
                    {"$match": {"paymentStatus": "paid", "paidAt": {"$gte": start, "$lte": end}}},
                    {"$unwind": "$items"},
                    {
                        "$group": {
                            "_id": "$items.menuItem",
                            "name": {"$first": "$items.name"},
                            "quantity": {"$sum": "$items.quantity"},
                            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
                            "cost": {"$sum": {"$multiply": [{"$ifNull": ["$items.cost", 0]}, "$items.quantity"]}},
                        }
                    },
                    {"$sort": {"quantity": -1}},
                ]
            )
        )

        sold_ids = {str(s["_id"]) for s in sold if s.get("_id")}
        enriched_sold = []
        for s in sold:
            rev = float(s.get("revenue", 0) or 0)
            cost = float(s.get("cost", 0) or 0)
            profit = rev - cost
            margin = round2((profit / rev) * 100) if rev > 0 else 0.0
            enriched_sold.append(
                {
                    "name": s["name"],
                    "quantity": s["quantity"],
                    "revenue": round2(rev),
                    "cost": round2(cost),
                    "profit": round2(profit),
                    "marginPct": margin,
                }
            )

        cat_map = {str(c["_id"]): c.get("name") for c in self.db.categories.find({}, {"name": 1})}
        menu_docs = list(
            self.db.menuitems.find(
                {"isArchived": {"$ne": True}},
                {"name": 1, "category": 1, "price": 1, "cost": 1, "isAvailable": 1},
            )
        )

        zero_sales = []
        margin_list = []
        for m in menu_docs:
            price = float(m.get("price", 0) or 0)
            cost = float(m.get("cost", 0) or 0)
            margin_pct = round2(((price - cost) / price) * 100) if price > 0 else 0.0
            entry = {
                "name": m.get("name"),
                "category": cat_map.get(str(m.get("category")), "Uncategorized"),
                "price": round2(price),
                "cost": round2(cost),
                "marginPct": margin_pct,
                "isAvailable": bool(m.get("isAvailable", True)),
            }
            margin_list.append(entry)
            if str(m["_id"]) not in sold_ids:
                zero_sales.append(entry["name"])

        margin_list.sort(key=lambda x: x["marginPct"])
        return to_json(
            {
                "currency": settings["currency"],
                "days": days,
                "totalActiveMenuItems": len(menu_docs),
                "topSelling": enriched_sold[:8],
                "lowestSelling": list(reversed(enriched_sold[-5:])) if len(enriched_sold) > 5 else [],
                "zeroSalesItems": zero_sales[:15],
                "lowestMarginItems": margin_list[:5],
                "highestMarginItems": list(reversed(margin_list[-5:])),
            }
        )

    # ─── 5. Inventory & Suppliers ─────────────────────────────────────────────
    def get_inventory_status(self, only_low: bool = True) -> dict[str, Any]:
        settings = self.get_settings()
        ingredients = list(self.db.ingredients.find({"isActive": True}))
        balances = {str(b["ingredient"]): float(b.get("quantity", 0) or 0) for b in self.db.inventories.find()}
        suppliers = {
            str(s["_id"]): {"name": s.get("name"), "phone": s.get("phone")}
            for s in self.db.suppliers.find({"isActive": True}, {"name": 1, "phone": 1})
        }

        all_items = []
        total_value = 0.0
        total_reorder_cost = 0.0

        for ing in ingredients:
            qty = balances.get(str(ing["_id"]), 0.0)
            min_stock = float(ing.get("minStock", 0) or 0)
            cost = float(ing.get("costPerUnit", 0) or 0)
            total_value += qty * cost
            is_low = qty <= min_stock
            deficit = max(0.0, min_stock - qty)
            reorder_cost = deficit * cost
            if is_low:
                total_reorder_cost += reorder_cost

            sup = suppliers.get(str(ing.get("supplier")))
            all_items.append(
                {
                    "name": ing.get("name"),
                    "unit": ing.get("unit"),
                    "quantity": round2(qty),
                    "minStock": round2(min_stock),
                    "deficit": round2(deficit),
                    "costPerUnit": round(cost, 4),
                    "estimatedReorderCost": round2(reorder_cost),
                    "isLow": is_low,
                    "supplier": sup,
                }
            )

        filtered = [i for i in all_items if i["isLow"]] if only_low else all_items
        filtered.sort(key=lambda x: (x["quantity"] - x["minStock"], -x["estimatedReorderCost"]))

        return to_json(
            {
                "currency": settings["currency"],
                "onlyLowStock": only_low,
                "totalIngredients": len(ingredients),
                "lowStockCount": sum(1 for i in all_items if i["isLow"]),
                "totalInventoryValue": round2(total_value),
                "estimatedMinReorderCost": round2(total_reorder_cost),
                "items": filtered[:25],
            }
        )

    # ─── 6. Expenses ──────────────────────────────────────────────────────────
    def get_expenses(
        self, from_date: Optional[str] = None, to_date: Optional[str] = None
    ) -> dict[str, Any]:
        settings = self.get_settings()
        tz = settings["timezone"]
        start, end = self._parse_range(from_date, to_date, tz, default_days=30)

        by_cat = list(
            self.db.expenses.aggregate(
                [
                    {"$match": {"date": {"$gte": start, "$lte": end}}},
                    {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
                    {"$sort": {"total": -1}},
                ]
            )
        )
        recent = list(
            self.db.expenses.find(
                {"date": {"$gte": start, "$lte": end}},
                {"amount": 1, "category": 1, "description": 1, "date": 1},
            )
            .sort("amount", -1)
            .limit(10)
        )
        total = sum(float(c["total"]) for c in by_cat)
        return to_json(
            {
                "currency": settings["currency"],
                "period": {"from": start.isoformat(), "to": end.isoformat()},
                "totalExpenses": round2(total),
                "byCategory": [
                    {"category": c["_id"], "total": round2(c["total"]), "count": c["count"]}
                    for c in by_cat
                ],
                "topExpenses": [
                    {
                        "category": r.get("category"),
                        "amount": round2(r.get("amount")),
                        "description": r.get("description"),
                        "date": r.get("date"),
                    }
                    for r in recent
                ],
            }
        )

    # ─── 7. Staff Performance & Payroll ───────────────────────────────────────
    def get_staff_performance(
        self, from_date: Optional[str] = None, to_date: Optional[str] = None
    ) -> dict[str, Any]:
        settings = self.get_settings()
        tz = settings["timezone"]
        start, end = self._parse_range(from_date, to_date, tz, default_days=30)

        sales_by_staff = list(
            self.db.orders.aggregate(
                [
                    {"$match": {"paymentStatus": "paid", "paidAt": {"$gte": start, "$lte": end}}},
                    {"$group": {"_id": "$createdBy", "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}},
                    {
                        "$lookup": {
                            "from": "users",
                            "localField": "_id",
                            "foreignField": "_id",
                            "as": "u",
                        }
                    },
                    {
                        "$project": {
                            "orders": 1,
                            "revenue": {"$round": ["$revenue", 2]},
                            "firstName": {"$arrayElemAt": ["$u.firstName", 0]},
                            "lastName": {"$arrayElemAt": ["$u.lastName", 0]},
                            "role": {"$arrayElemAt": ["$u.role", 0]},
                        }
                    },
                    {"$sort": {"revenue": -1}},
                ]
            )
        )

        # Projection strictly excludes password, passwordChangedAt, avatar, email
        active_users = list(
            self.db.users.find(
                {"isActive": True},
                {"firstName": 1, "lastName": 1, "role": 1, "jobTitle": 1, "salary": 1},
            )
        )
        by_role: dict[str, int] = {}
        total_payroll = 0.0
        for u in active_users:
            r = u.get("role") or "unknown"
            by_role[r] = by_role.get(r, 0) + 1
            total_payroll += float(u.get("salary") or 0)

        return to_json(
            {
                "currency": settings["currency"],
                "activeStaffCount": len(active_users),
                "staffByRole": by_role,
                "monthlyPayrollTotal": round2(total_payroll),
                "topPerformers": [
                    {
                        "name": " ".join(f"{s.get('firstName', '')} {s.get('lastName', '')}".split()) or "Unknown",
                        "role": s.get("role"),
                        "orders": s.get("orders", 0),
                        "revenue": round2(s.get("revenue", 0)),
                    }
                    for s in sales_by_staff
                ],
            }
        )

    # ─── 8. Kitchen Speed & Payments ──────────────────────────────────────────
    def get_kitchen_and_payments(
        self, from_date: Optional[str] = None, to_date: Optional[str] = None
    ) -> dict[str, Any]:
        settings = self.get_settings()
        tz = settings["timezone"]
        start, end = self._parse_range(from_date, to_date, tz, default_days=30)

        prep_docs = list(
            self.db.orders.find(
                {
                    "createdAt": {"$gte": start, "$lte": end},
                    "preparingAt": {"$ne": None},
                    "readyAt": {"$ne": None},
                },
                {"preparingAt": 1, "readyAt": 1},
            )
        )
        prep_mins = [
            (d["readyAt"] - d["preparingAt"]).total_seconds() / 60
            for d in prep_docs
            if d["readyAt"] >= d["preparingAt"]
        ]
        avg_prep = round2(sum(prep_mins) / len(prep_mins)) if prep_mins else None

        queue_agg = list(
            self.db.orders.aggregate(
                [
                    {"$match": {"status": {"$in": ["new", "preparing", "ready", "served"]}}},
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                ]
            )
        )

        pay_agg = list(
            self.db.payments.aggregate(
                [
                    {"$match": {"paidAt": {"$gte": start, "$lte": end}}},
                    {
                        "$group": {
                            "_id": {"method": "$method", "status": "$status"},
                            "total": {"$sum": "$amount"},
                            "count": {"$sum": 1},
                        }
                    },
                ]
            )
        )

        refunds = list(
            self.db.payments.find(
                {"status": "refunded", "refundedAt": {"$gte": start, "$lte": end}},
                {"amount": 1, "method": 1, "refundReason": 1, "refundedAt": 1},
            )
            .sort("refundedAt", -1)
            .limit(10)
        )

        by_method: dict[str, dict[str, Any]] = {}
        refund_total = 0.0
        refund_count = 0
        for p in pay_agg:
            m = p["_id"]["method"]
            st = p["_id"]["status"]
            if st == "refunded":
                refund_total += float(p["total"] or 0)
                refund_count += int(p["count"] or 0)
            else:
                cur = by_method.setdefault(m, {"total": 0.0, "count": 0})
                cur["total"] = round2(cur["total"] + float(p["total"] or 0))
                cur["count"] += int(p["count"] or 0)

        return to_json(
            {
                "currency": settings["currency"],
                "kitchenQueue": {q["_id"]: q["count"] for q in queue_agg},
                "avgPrepTimeMinutes": avg_prep,
                "prepSampleCount": len(prep_mins),
                "paymentsByMethod": by_method,
                "refunds": {
                    "count": refund_count,
                    "total": round2(refund_total),
                    "recent": refunds,
                },
            }
        )
