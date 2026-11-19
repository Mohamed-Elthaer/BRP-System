"""
tools.py — Groq Function Calling schemas and tool execution registry for BRP ERP Agent.
"""

from typing import Any
from mongo_engine import MongoERPEngine

ERP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_business_overview",
            "description": (
                "جلب الملخص المالي والتشغيلي الشامل للمطعم: الإيرادات، تكلفة الطعام (COGS)، "
                "مجمل الربح، المصروفات، صافي الربح، عدد الأوردرات، متوسط قيمة الأوردر، "
                "المقارنة بالفترة السابقة، الأوردرات النشطة، وتنبيهات المخزون."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {
                        "type": "string",
                        "description": "تاريخ البداية بصيغة YYYY-MM-DD (اختياري، اتركه فارغاً لملخص اليوم وآخر 30 يوم).",
                    },
                    "to_date": {
                        "type": "string",
                        "description": "تاريخ النهاية بصيغة YYYY-MM-DD (اختياري).",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_trend",
            "description": (
                "تحليل اتجاه المبيعات: يومياً، أو بالساعة لمعرفة أوقات الذروة، أو حسب نوع الطلب "
                "(dine_in صالة، takeaway تيك أواي، delivery دليفري)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "عدد الأيام السابقة للتحليل (الافتراضي 14).",
                    },
                    "group_by": {
                        "type": "string",
                        "enum": ["day", "hour", "order_type"],
                        "description": "طريقة التجميع: day أو hour (ساعات الذروة) أو order_type.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_orders",
            "description": (
                "عرض تفاصيل الأوردرات حسب الحالة (مفتوحة/نشطة، مكتملة، ملغية مع أسباب الإلغاء) أو نوع الطلب."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "active", "new", "preparing", "ready", "served", "completed", "cancelled"],
                        "description": "active للأوردرات المفتوحة حالياً، cancelled للملغية، completed للمكتملة، أو all.",
                    },
                    "order_type": {
                        "type": "string",
                        "enum": ["dine_in", "takeaway", "delivery"],
                        "description": "تصفية حسب نوع الأوردر (اختياري).",
                    },
                    "from_date": {"type": "string", "description": "YYYY-MM-DD (اختياري)."},
                    "to_date": {"type": "string", "description": "YYYY-MM-DD (اختياري)."},
                    "limit": {"type": "integer", "description": "عدد الأوردرات المطلوبة (الافتراضي 15)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_menu_performance",
            "description": (
                "تحليل أداء المنيو: أكثر الأصناف مبيعاً، أقلها مبيعاً، الأصناف التي لم تُبع نهائياً، "
                "وهامش الربح (Profit Margin) لكل صنف وتكلفته."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "عدد الأيام للتحليل (الافتراضي 30).",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_inventory_status",
            "description": (
                "فحص المخزون والمكونات: النواقص تحت الحد الأدنى، كمية العجز، تكلفة إعادة الشراء، "
                "والموردين وأرقامهم، وإجمالي قيمة المخزون."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "only_low": {
                        "type": "boolean",
                        "description": "true لعرض النواقص فقط، false لعرض كل المخزون.",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_expenses",
            "description": "تقرير المصروفات التشغيلية مجمعة حسب الفئة وأكبر بنود الصرف خلال فترة محددة.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "YYYY-MM-DD (اختياري، الافتراضي آخر 30 يوم)."},
                    "to_date": {"type": "string", "description": "YYYY-MM-DD (اختياري)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_staff_performance",
            "description": "أداء الموظفين والكاشير (عدد الأوردرات وقيمة المبيعات لكل موظف)، عدد الموظفين حسب الدور، وإجمالي الرواتب.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "YYYY-MM-DD (اختياري)."},
                    "to_date": {"type": "string", "description": "YYYY-MM-DD (اختياري)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_kitchen_and_payments",
            "description": "سرعة تحضير المطبخ (متوسط وقت التحضير بالدقائق وطابور المطبخ الحالي) وطرق الدفع والمرتجعات.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "YYYY-MM-DD (اختياري)."},
                    "to_date": {"type": "string", "description": "YYYY-MM-DD (اختياري)."},
                },
            },
        },
    },
]

TOOL_LABELS = {
    "get_business_overview": {"ar": "جاري تحليل المبيعات والأرباح...", "en": "Analyzing sales & profits..."},
    "get_sales_trend": {"ar": "جاري تحليل اتجاه المبيعات وأوقات الذروة...", "en": "Analyzing sales trends..."},
    "get_orders": {"ar": "جاري فحص الأوردرات والحالات...", "en": "Checking orders & statuses..."},
    "get_menu_performance": {"ar": "جاري تحليل أداء المنيو وهوامش الربح...", "en": "Analyzing menu performance & margins..."},
    "get_inventory_status": {"ar": "جاري فحص أرصدة المخزون والموردين...", "en": "Checking inventory & suppliers..."},
    "get_expenses": {"ar": "جاري مراجعة المصروفات التشغيلية...", "en": "Reviewing operating expenses..."},
    "get_staff_performance": {"ar": "جاري تحليل أداء الموظفين...", "en": "Checking staff performance..."},
    "get_kitchen_and_payments": {"ar": "جاري فحص سرعة المطبخ والمدفوعات...", "en": "Checking kitchen speed & payments..."},
}


class ToolRegistry:
    def __init__(self, engine: MongoERPEngine):
        self.engine = engine

    def execute(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        args = args or {}
        if name == "get_business_overview":
            return self.engine.get_business_overview(
                from_date=args.get("from_date"),
                to_date=args.get("to_date"),
            )
        if name == "get_sales_trend":
            return self.engine.get_sales_trend(
                days=int(args.get("days") or 14),
                group_by=args.get("group_by") or "day",
            )
        if name == "get_orders":
            return self.engine.get_orders(
                status=args.get("status") or "all",
                order_type=args.get("order_type"),
                from_date=args.get("from_date"),
                to_date=args.get("to_date"),
                limit=int(args.get("limit") or 15),
            )
        if name == "get_menu_performance":
            return self.engine.get_menu_performance(days=int(args.get("days") or 30))
        if name == "get_inventory_status":
            return self.engine.get_inventory_status(only_low=bool(args.get("only_low", True)))
        if name == "get_expenses":
            return self.engine.get_expenses(
                from_date=args.get("from_date"),
                to_date=args.get("to_date"),
            )
        if name == "get_staff_performance":
            return self.engine.get_staff_performance(
                from_date=args.get("from_date"),
                to_date=args.get("to_date"),
            )
        if name == "get_kitchen_and_payments":
            return self.engine.get_kitchen_and_payments(
                from_date=args.get("from_date"),
                to_date=args.get("to_date"),
            )
        return {"error": f"Unknown tool: {name}"}
