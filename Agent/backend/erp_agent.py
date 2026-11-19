"""
erp_agent.py — Multi-step Restaurant Owner AI Agent for BRP System.
Uses Groq Function Calling + Model Fallback Chain + Async Typed SSE Streaming.
"""

import os
import json
import logging
import asyncio
import re
from datetime import datetime
from typing import Any, AsyncGenerator, Optional, Tuple
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from groq import AsyncGroq

from mongo_engine import MongoERPEngine
from tools import ERP_TOOLS, TOOL_LABELS, ToolRegistry

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

logger = logging.getLogger("erp_agent")
logging.basicConfig(level=logging.INFO, format="[ERP-AGENT] %(levelname)s — %(message)s")

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
FALLBACK_MODEL = os.getenv("GROQ_FAST_MODEL", "llama-3.3-70b-versatile")
MAX_STEPS = 4

ERP_TRIGGER_RE = re.compile(
    r"(تقرير|مبيعات|أرباح|ارباح|ربح|أوردر|اوردر|طلبات|مخزون|مخزن|نواقص|خامات|مكونات|"
    r"منيو|أصناف|اصناف|صنف|مصروف|مصاريف|موظف|موظفين|كاشير|مطبخ|دفع|مرتجع|ذروة|أخبار|ملخص|"
    r"sales|revenue|profit|margin|order|inventory|stock|ingredient|menu|dish|expense|staff|employee|kitchen|payment|refund|summary|report)",
    re.IGNORECASE,
)


def _is_arabic(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06FF]", text or ""))


def _build_system_prompt(settings: dict[str, Any]) -> str:
    tz_name = settings.get("timezone", "Africa/Cairo")
    try:
        now_local = datetime.now(ZoneInfo(tz_name))
    except Exception:
        now_local = datetime.now()

    return (
        f"أنت المستشار الذكي والمساعد التنفيذي (AI ERP Agent) لمالك مطعم \"{settings.get('restaurantName', 'My Restaurant')}\".\n"
        f"العملة: {settings.get('currency', 'EGP')} | المنطقة الزمنية: {tz_name}\n"
        f"التاريخ والوقت الحالي للمطعم: {now_local.strftime('%Y-%m-%d %H:%M (%A)')}\n\n"
        "قواعد العمل الأساسية:\n"
        "1. استخدم الأدوات المتاحة (Tools) دائماً لجلب الأرقام الحقيقية من قاعدة البيانات قبل الإجابة عن أي سؤال يخص المبيعات، الأرباح، الأوردرات، المنيو، المخزون، المصروفات، الموظفين، أو المطبخ.\n"
        "2. يُمنع منعاً باتاً اختراع أو تخمين أي أرقام؛ اعتمد فقط على البيانات المسترجعة من الأدوات.\n"
        "3. رد بنفس لغة سؤال المالك (عربي مصري واضح ومباشر إذا سأل بالعربي، أو English إذا سأل بالإنجليزي).\n"
        "4. نسّق الإجابة بشكل تنفيذي احترافي باستخدام Markdown (جداول واضحة عند مقارنة الأصناف أو الأوردرات، نقاط مختصرة، والعملة بجانب الأرقام).\n"
        "5. إذا سأل المالك عن فترة مثل 'اليوم' أو 'أمس' أو 'الأسبوع اللي فات' أو 'هذا الشهر'، احسب التواريخ الدقيقة YYYY-MM-DD بناءً على التاريخ الحالي أعلاه.\n"
        "6. في نهاية كل تقرير أو تحليل تشغيلي/مالي، أضف قسماً مختصاً بعنوان **💡 توصيات للمالك** (أو **💡 Recommendations** بالإنجليزية) من 2 إلى 4 نقاط عملية مبنية على الأرقام (مثل: نواقص تحتاج شراء فوراً، أصناف هامش ربحها ضعيف أو بدون مبيعات، أسباب إلغاء الأوردرات، أو ساعات الذروة).\n"
    )


class RestaurantERPAgent:
    def __init__(self, engine: Optional[MongoERPEngine] = None):
        self.engine = engine or MongoERPEngine()
        self.registry = ToolRegistry(self.engine)
        self.api_key = os.getenv("GROQ_API_KEY") or os.getenv("ARIA_GROQ_API_KEY")
        self.models = [m for m in [DEFAULT_MODEL, FALLBACK_MODEL] if m]
        self.async_groq = AsyncGroq(api_key=self.api_key) if self.api_key else None

    def _infer_local_tools(self, user_query: str) -> list[tuple[str, dict[str, Any]]]:
        q = (user_query or "").lower()
        calls: list[tuple[str, dict[str, Any]]] = []
        if re.search(r"مبيعات|أرباح|ارباح|ربح|ملخص|أخبار|تقرير|sales|revenue|profit|summary|report", q):
            calls.append(("get_business_overview", {}))
        if re.search(r"ذروة|اتجاه|ساعة|يومي|أسبوع|اسبوع|trend|peak|hour|daily", q):
            group_by = "hour" if re.search(r"ذروة|ساعة|ساعات|peak|hour", q) else "day"
            calls.append(("get_sales_trend", {"days": 14, "group_by": group_by}))
        if re.search(r"أوردر|اوردر|طلبات|ملغ|نشط|مفتوح|order|cancel|active", q):
            status = "cancelled" if re.search(r"ملغ|cancel", q) else ("active" if re.search(r"نشط|مفتوح|حالي|active", q) else "all")
            calls.append(("get_orders", {"status": status, "limit": 12}))
        if re.search(r"منيو|أصناف|اصناف|صنف|هامش|وجب|dish|menu|item|margin|sell", q):
            calls.append(("get_menu_performance", {"days": 30}))
        if re.search(r"مخزن|مخزون|نواقص|خامات|مكون|مورد|stock|inventory|ingredient|supplier|low", q):
            calls.append(("get_inventory_status", {"only_low": True}))
        if re.search(r"مصروف|مصاريف|تكاليف|expense|cost", q):
            calls.append(("get_expenses", {}))
        if re.search(r"موظف|موظفين|كاشير|رواتب|مرتب|فريق|staff|employee|cashier|payroll", q):
            calls.append(("get_staff_performance", {}))
        if re.search(r"مطبخ|تحضير|دفع|كاش|فيزا|مرتجع|kitchen|prep|payment|refund", q):
            calls.append(("get_kitchen_and_payments", {}))

        if not calls:
            calls.append(("get_business_overview", {}))
            calls.append(("get_menu_performance", {"days": 30}))
            calls.append(("get_inventory_status", {"only_low": True}))
        return calls

    async def _run_tools(
        self, calls: list[tuple[str, str, dict[str, Any]]], ar: bool
    ) -> list[Tuple[str, str, dict[str, Any]]]:
        """Run tool calls in parallel via thread pool and return (tool_call_id, name, result)."""
        async def run_one(tc_id: str, name: str, args: dict[str, Any]):
            try:
                res = await asyncio.to_thread(self.registry.execute, name, args)
            except Exception as exc:
                logger.error(f"Tool {name} failed: {exc}")
                res = {"error": str(exc)}
            return tc_id, name, res

        return await asyncio.gather(*(run_one(tc_id, name, args) for tc_id, name, args in calls))

    def _format_offline_report(self, data: dict[str, Any], ar: bool) -> str:
        lines = ["### 📊 التقرير التنفيذي من بيانات المطعم" if ar else "### 📊 Restaurant Executive Report"]
        if "get_business_overview" in data:
            ov = data["get_business_overview"]
            cur = ov.get("current", {})
            c = ov.get("currency", "EGP")
            lines.append(
                f"\n**{'ملخص اليوم' if ar else 'Overview'} ({ov.get('restaurantName', '')}):**\n"
                f"- **{'الإيرادات' if ar else 'Revenue'}:** {cur.get('revenue', 0):,.2f} {c} ({cur.get('paidOrders', 0)} {'طلب مدفوع' if ar else 'paid orders'})\n"
                f"- **{'صافي الربح' if ar else 'Net Profit'}:** {cur.get('netProfit', 0):,.2f} {c} | **{'المصروفات' if ar else 'Expenses'}:** {cur.get('expenses', 0):,.2f} {c}\n"
                f"- **{'طلبات نشطة' if ar else 'Active Orders'}:** {ov.get('ongoingTotal', 0)} | **{'نواقص المخزون' if ar else 'Low Stock'}:** {ov.get('lowStockCount', 0)}"
            )
        if "get_menu_performance" in data:
            mp = data["get_menu_performance"]
            c = mp.get("currency", "EGP")
            top = mp.get("topSelling", [])[:5]
            if top:
                lines.append(f"\n**{'الأكثر مبيعاً' if ar else 'Top Selling Items'}:**")
                for idx, item in enumerate(top, 1):
                    lines.append(
                        f"{idx}. **{item['name']}** — {item['quantity']} ({item['revenue']:,.2f} {c}, margin {item['marginPct']}%)"
                    )
        if "get_inventory_status" in data:
            inv = data["get_inventory_status"]
            items = inv.get("items", [])[:8]
            lines.append(
                f"\n**{'تنبيهات المخزون' if ar else 'Low Stock Alerts'} ({inv.get('lowStockCount', 0)}):**"
            )
            for item in items:
                lines.append(
                    f"- **{item['name']}**: {item['quantity']} {item['unit']} (min: {item['minStock']} {item['unit']})"
                )
        if "get_orders" in data:
            orders = data["get_orders"].get("orders", [])[:6]
            if orders:
                lines.append(f"\n**{'أحدث الأوردرات' if ar else 'Recent Orders'}:**")
                for o in orders:
                    lines.append(f"- `{o['orderNumber']}` ({o['orderType']}) — **{o['status']}** — {o['total']} {data['get_orders'].get('currency', 'EGP')}")
        if "get_expenses" in data:
            ex = data["get_expenses"]
            lines.append(f"\n**{'المصروفات' if ar else 'Expenses'}:** {ex.get('totalExpenses', 0):,.2f} {ex.get('currency', 'EGP')}")
        return "\n".join(lines)

    async def stream_response(
        self, message: str, history: list[dict[str, str]]
    ) -> AsyncGenerator[Tuple[str, dict[str, Any]], None]:
        ar = _is_arabic(message)

        try:
            settings = await asyncio.to_thread(self.engine.get_settings)
        except Exception as exc:
            logger.error(f"Database settings error: {exc}")
            yield ("error", {"message": "تعذر الاتصال بقاعدة البيانات حالياً" if ar else "Database unavailable"})
            return

        system_prompt = _build_system_prompt(settings)
        base_messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for h in (history or [])[-8:]:
            role = "assistant" if h.get("role") == "assistant" else "user"
            content = str(h.get("content") or "").strip()
            if content:
                base_messages.append({"role": role, "content": content})
        base_messages.append({"role": "user", "content": message})

        tools_used: list[str] = []
        collected_data: dict[str, Any] = {}
        final_text: Optional[str] = None
        used_model = "offline"

        if self.async_groq:
            for model_name in self.models:
                convo = list(base_messages)
                tools_used = []
                collected_data = {}
                try:
                    for step in range(MAX_STEPS):
                        resp = await self.async_groq.chat.completions.create(
                            model=model_name,
                            messages=convo,
                            tools=ERP_TOOLS,
                            tool_choice="auto",
                            max_tokens=1500,
                            temperature=0.25,
                        )
                        msg = resp.choices[0].message

                        # Safeguard on step 0: if user asked an ERP question and LLM skipped tools
                        if step == 0 and not msg.tool_calls and ERP_TRIGGER_RE.search(message):
                            inferred = self._infer_local_tools(message)
                            for t_name, t_args in inferred:
                                lbl = TOOL_LABELS.get(t_name, {}).get("ar" if ar else "en", t_name)
                                yield ("status", {"text": lbl})
                            results = await self._run_tools(
                                [(f"local_{i}", n, a) for i, (n, a) in enumerate(inferred)], ar
                            )
                            for _, n, res in results:
                                tools_used.append(n)
                                collected_data[n] = res
                            convo.append(
                                {
                                    "role": "user",
                                    "content": (
                                        "البيانات الحقيقية المستخرجة من قاعدة بيانات المطعم (JSON):\n"
                                        f"```json\n{json.dumps(collected_data, ensure_ascii=False)}\n```\n"
                                        "أجب الآن على سؤال المالك بدقة باستخدام هذه الأرقام الحقيقية فقط مع التوصيات."
                                    ),
                                }
                            )
                            synth = await self.async_groq.chat.completions.create(
                                model=model_name,
                                messages=convo,
                                max_tokens=2048,
                                temperature=0.25,
                                stream=True,
                            )
                            async for chunk in synth:
                                delta = getattr(chunk.choices[0].delta, "content", None) if chunk.choices else None
                                if delta:
                                    yield ("token", {"text": delta})
                            yield ("done", {"provider": f"groq:{model_name}", "tools": tools_used})
                            return

                        if not msg.tool_calls:
                            final_text = msg.content or ""
                            used_model = f"groq:{model_name}"
                            break

                        # Record assistant tool_call turn
                        assistant_turn: dict[str, Any] = {
                            "role": "assistant",
                            "content": msg.content or "",
                            "tool_calls": [
                                {
                                    "id": tc.id,
                                    "type": "function",
                                    "function": {
                                        "name": tc.function.name,
                                        "arguments": tc.function.arguments or "{}",
                                    },
                                }
                                for tc in msg.tool_calls
                            ],
                        }
                        convo.append(assistant_turn)

                        parsed_calls = []
                        for tc in msg.tool_calls:
                            t_name = tc.function.name
                            try:
                                t_args = json.loads(tc.function.arguments or "{}")
                            except Exception:
                                t_args = {}
                            lbl = TOOL_LABELS.get(t_name, {}).get("ar" if ar else "en", t_name)
                            yield ("status", {"text": lbl})
                            parsed_calls.append((tc.id, t_name, t_args))

                        results = await self._run_tools(parsed_calls, ar)
                        for tc_id, t_name, res in results:
                            tools_used.append(t_name)
                            collected_data[t_name] = res
                            convo.append(
                                {
                                    "role": "tool",
                                    "tool_call_id": tc_id,
                                    "content": json.dumps(res, ensure_ascii=False),
                                }
                            )

                    # If loop hit MAX_STEPS without final text, stream final synthesis
                    if final_text is None:
                        used_model = f"groq:{model_name}"
                        synth = await self.async_groq.chat.completions.create(
                            model=model_name,
                            messages=convo,
                            max_tokens=2048,
                            temperature=0.25,
                            stream=True,
                        )
                        async for chunk in synth:
                            delta = getattr(chunk.choices[0].delta, "content", None) if chunk.choices else None
                            if delta:
                                yield ("token", {"text": delta})
                        yield ("done", {"provider": used_model, "tools": tools_used})
                        return

                    # Stream final_text smoothly in token chunks
                    for piece in re.findall(r"\S+\s*|\n", final_text):
                        yield ("token", {"text": piece})
                        await asyncio.sleep(0.008)
                    yield ("done", {"provider": used_model, "tools": tools_used})
                    return

                except Exception as exc:
                    logger.warning(f"Model {model_name} failed: {exc}")
                    continue

        # Offline fallback if Groq API is unavailable or all models failed
        if not collected_data:
            inferred = self._infer_local_tools(message)
            for t_name, _ in inferred:
                lbl = TOOL_LABELS.get(t_name, {}).get("ar" if ar else "en", t_name)
                yield ("status", {"text": lbl})
            results = await self._run_tools(
                [(f"off_{i}", n, a) for i, (n, a) in enumerate(inferred)], ar
            )
            for _, n, res in results:
                tools_used.append(n)
                collected_data[n] = res

        report = self._format_offline_report(collected_data, ar)
        yield ("token", {"text": report})
        yield ("done", {"provider": "offline", "tools": tools_used})
