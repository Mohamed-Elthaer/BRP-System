import axios from "axios";
import asyncWrapper from "../middleware/asyncWrapper.js";
import User from "../models/ModelUser.js";
import { getSettings } from "../services/settingsService.js";
import { getOverview } from "../services/reportService.js";
import { parseDateRange } from "../utils/queryHelpers.js";
import { zonedDayRange } from "../utils/timezone.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";

const AGENT_URL = (process.env.AGENT_URL || "http://127.0.0.1:8005").replace(/\/+$/, "");

const todayYmd = (timezone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const loadRestaurantContext = async () => {
  const settings = await getSettings();
  const timezone = settings.timezone || "UTC";
  const currency = settings.currency || "EGP";
  const todayRange = zonedDayRange(todayYmd(timezone), timezone);
  const monthRange = parseDateRange({}, 30);

  const [today, month, staffCount] = await Promise.all([
    getOverview({ ...todayRange, timezone }),
    getOverview({ ...monthRange, timezone }),
    User.countDocuments({ isActive: true }),
  ]);

  return {
    restaurantName: settings.restaurant?.name || "Restaurant",
    currency,
    timezone,
    staffCount,
    today,
    month,
  };
};

const isArabic = (text) => /[\u0600-\u06FF]/.test(text);

const fmtMoney = (n, currency) => `${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;

const sumOngoing = (ongoingOrders) =>
  Object.values(ongoingOrders || {}).reduce((s, n) => s + Number(n || 0), 0);

const buildLocalReply = (message, ctx) => {
  const q = message.toLowerCase();
  const ar = isArabic(message);
  const { currency, today, month, restaurantName, staffCount } = ctx;
  const t = today.current || {};
  const m = month.current || {};

  const ongoingTotal = sumOngoing(today.ongoingOrders);
  const lowStock = today.lowStock || [];
  const topMeals = month.topMeals || [];
  const bottomMeals = month.bottomMeals || [];

  if (/stock|inventory|ingredient|low|مخزون|مكونات|نواقص|قليل/.test(q)) {
    if (!lowStock.length) {
      return ar
        ? `المخزون في **${restaurantName}** بحالة ممتازة حالياً — لا توجد مكونات تحت الحد الأدنى.`
        : `Inventory at **${restaurantName}** looks healthy — there are currently no ingredients at or below minimum stock.`;
    }
    const list = lowStock
      .slice(0, 8)
      .map((i) => `• **${i.name}**: ${i.quantity} ${i.unit} (min: ${i.minStock} ${i.unit})`)
      .join("\n");
    return ar
      ? `يوجد حالياً **${lowStock.length}** مكون وصل للحد الأدنى أو أقل:\n${list}`
      : `There are currently **${lowStock.length}** low-stock ingredients:\n${list}`;
  }

  if (/top|best|popular|menu|dish|meal|أكثر|أفضل|أصناف|منيو|وجب/.test(q)) {
    const topList = topMeals.length
      ? topMeals.slice(0, 5).map((x, i) => `${i + 1}. **${x.name}** — ${x.quantity} sold (${fmtMoney(x.revenue, currency)})`).join("\n")
      : ar ? "لا توجد مبيعات كافية آخر 30 يوم." : "No sales data in the last 30 days.";
    const bottomList = bottomMeals.length
      ? bottomMeals.slice(0, 3).map((x) => `• **${x.name}** (${x.quantity} sold)`).join("\n")
      : "";
    return ar
      ? `**أكثر الأصناف مبيعاً (آخر 30 يوم):**\n${topList}${bottomList ? `\n\n**أقل الأصناف مبيعاً:**\n${bottomList}` : ""}`
      : `**Top selling items (last 30 days):**\n${topList}${bottomList ? `\n\n**Lowest selling items:**\n${bottomList}` : ""}`;
  }

  if (/order|kitchen|active|pending|ongoing|أوردر|طلبات|مطبخ|شغال/.test(q)) {
    const entries = Object.entries(today.ongoingOrders || {});
    const breakdown = entries.map(([status, count]) => `• ${status}: **${count}**`).join("\n");
    return ar
      ? `يوجد حالياً **${ongoingTotal}** طلب نشط في التشغيل.\n${breakdown || "لا توجد طلبات نشطة الآن."}\n\nإجمالي طلبات اليوم: **${t.totalOrders ?? 0}** (ملغي: ${t.cancelledOrders ?? 0}).`
      : `There are currently **${ongoingTotal}** active orders in progress.\n${breakdown || "No active orders right now."}\n\nToday's total orders: **${t.totalOrders ?? 0}** (cancelled: ${t.cancelledOrders ?? 0}).`;
  }

  if (/expense|profit|cost|margin|مصروف|مصاريف|ربح|أرباح|تكلف/.test(q)) {
    return ar
      ? `**الملخص المالي (اليوم / آخر 30 يوم):**\n• إيرادات اليوم: **${fmtMoney(t.revenue, currency)}** | مصروفات: **${fmtMoney(t.expenses, currency)}** | صافي الربح: **${fmtMoney(t.netProfit, currency)}**\n• إيرادات 30 يوم: **${fmtMoney(m.revenue, currency)}** | مصروفات: **${fmtMoney(m.expenses, currency)}** | صافي الربح: **${fmtMoney(m.netProfit, currency)}**`
      : `**Financial Summary (Today / Last 30 days):**\n• Today: Revenue **${fmtMoney(t.revenue, currency)}** | Expenses **${fmtMoney(t.expenses, currency)}** | Net Profit **${fmtMoney(t.netProfit, currency)}**\n• Last 30 days: Revenue **${fmtMoney(m.revenue, currency)}** | Expenses **${fmtMoney(m.expenses, currency)}** | Net Profit **${fmtMoney(m.netProfit, currency)}**`;
  }

  if (/staff|employee|team|user|موظف|موظفين|فريق/.test(q)) {
    const topEmp = (month.employees || [])
      .slice(0, 4)
      .map((e, i) => `${i + 1}. **${e.name}** — ${e.orders} orders (${fmtMoney(e.revenue, currency)})`)
      .join("\n");
    return ar
      ? `عدد الموظفين النشطين حالياً: **${staffCount}**.\n${topEmp ? `\n**أفضل أداء في آخر 30 يوم:**\n${topEmp}` : ""}`
      : `You currently have **${staffCount}** active staff members.\n${topEmp ? `\n**Top performers (last 30 days):**\n${topEmp}` : ""}`;
  }

  const topDish = topMeals[0] ? `${topMeals[0].name} (${topMeals[0].quantity} sold)` : "N/A";
  return ar
    ? `**ملخص ${restaurantName} اليوم:**\n• الإيرادات: **${fmtMoney(t.revenue, currency)}** (${t.paidOrders ?? 0} طلب مدفوع، متوسط الطلب ${fmtMoney(t.avgOrderValue, currency)})\n• صافي الربح اليوم: **${fmtMoney(t.netProfit, currency)}** | المصروفات: **${fmtMoney(t.expenses, currency)}**\n• طلبات نشطة حالياً: **${ongoingTotal}**\n• تنبيهات نقص المخزون: **${lowStock.length}**\n• الأكثر مبيعاً (30 يوم): **${topDish}**\n\nتقدر تسألني عن المبيعات، الأرباح، المخزون، المنيو، الطلبات، أو الموظفين.`
    : `**${restaurantName} — Today's Snapshot:**\n• Revenue: **${fmtMoney(t.revenue, currency)}** (${t.paidOrders ?? 0} paid orders, avg ${fmtMoney(t.avgOrderValue, currency)})\n• Net Profit: **${fmtMoney(t.netProfit, currency)}** | Expenses: **${fmtMoney(t.expenses, currency)}**\n• Active Orders: **${ongoingTotal}** | Low-Stock Alerts: **${lowStock.length}**\n• Top Dish (30d): **${topDish}**\n\nAsk me about sales, profits, low stock, top menu items, active orders, or staff performance!`;
};

const callGemini = async (message, history, ctx) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const systemText = `You are the AI Assistant for "${ctx.restaurantName}" Restaurant ERP. Answer concisely in the same language as the user (English or Arabic). Use ONLY the live metrics below—never invent numbers.\n\nLIVE DATA (${ctx.currency}, ${ctx.timezone}):\n${JSON.stringify({
    staffCount: ctx.staffCount,
    today: ctx.today.current,
    ongoingOrders: ctx.today.ongoingOrders,
    lowStock: ctx.today.lowStock,
    last30Days: ctx.month.current,
    topMeals: ctx.month.topMeals?.slice(0, 5),
    bottomMeals: ctx.month.bottomMeals?.slice(0, 5),
  })}`;

  const contents = [
    ...(Array.isArray(history) ? history.slice(-8) : []).map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: String(h.content || "") }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { systemInstruction: { parts: [{ text: systemText }] }, contents },
    { timeout: 15000 },
  );

  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
};

const callOpenAI = async (message, history, ctx) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const systemText = `You are the AI Assistant for "${ctx.restaurantName}" Restaurant ERP. Answer concisely in the user's language (English or Arabic) using ONLY these live metrics:\n${JSON.stringify({
    currency: ctx.currency,
    staffCount: ctx.staffCount,
    today: ctx.today.current,
    ongoingOrders: ctx.today.ongoingOrders,
    lowStock: ctx.today.lowStock,
    last30Days: ctx.month.current,
    topMeals: ctx.month.topMeals?.slice(0, 5),
  })}`;

  const messages = [
    { role: "system", content: systemText },
    ...(Array.isArray(history) ? history.slice(-8) : []).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: String(h.content || ""),
    })),
    { role: "user", content: message },
  ];

  const { data } = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    { model: "gpt-4o-mini", messages, temperature: 0.3 },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 },
  );

  return data?.choices?.[0]?.message?.content?.trim() || null;
};

const callGroq = async (message, history, ctx) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.ARIA_GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const systemText = `أنت المستشار الذكي والمساعد التنفيذي (AI ERP Agent) لمالك مطعم "${ctx.restaurantName}".
العملة: ${ctx.currency} | المنطقة الزمنية: ${ctx.timezone}
التاريخ الحالي: ${todayYmd(ctx.timezone)}

قواعد العمل الأساسية:
1. اعتمد حصرياً على البيانات الحقيقية أدناه من قاعدة البيانات ولا تخترع أي أرقام.
2. رد بنفس لغة سؤال المالك (عربي مصري واضح ومباشر إذا سأل بالعربي، أو English إذا سأل بالإنجليزي).
3. نسّق الإجابة بشكل تنفيذي احترافي باستخدام Markdown (جداول أو نقاط واضحة مع العملة).
4. أضف في النهاية قسماً مختصراً بعنوان **💡 توصيات للمالك** (أو **💡 Recommendations**) من 2-3 نقاط عملية.

LIVE RESTAURANT DATA:
${JSON.stringify({
  restaurantName: ctx.restaurantName,
  currency: ctx.currency,
  staffCount: ctx.staffCount,
  todaySummary: ctx.today.current,
  ongoingOrders: ctx.today.ongoingOrders,
  lowStockIngredients: ctx.today.lowStock,
  last30DaysSummary: ctx.month.current,
  topSellingMeals: ctx.month.topMeals?.slice(0, 8),
  bottomSellingMeals: ctx.month.bottomMeals?.slice(0, 5),
  topStaff: ctx.month.employees?.slice(0, 6),
})}`;

  const messages = [
    { role: "system", content: systemText },
    ...(Array.isArray(history) ? history.slice(-8) : []).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: String(h.content || ""),
    })),
    { role: "user", content: message },
  ];

  const { data } = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    { model, messages, temperature: 0.3, max_tokens: 1200 },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 12000,
    },
  );

  return data?.choices?.[0]?.message?.content?.trim() || null;
};

const checkAgentHealth = async () => {
  try {
    const res = await fetch(`${AGENT_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
};

const writeSse = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const getBriefing = asyncWrapper(async (_req, res) => {
  const [ctx, agentOnline] = await Promise.all([loadRestaurantContext(), checkAgentHealth()]);
  const ongoingCount = sumOngoing(ctx.today.ongoingOrders);
  const hasGroq = Boolean(process.env.GROQ_API_KEY || process.env.ARIA_GROQ_API_KEY);
  const provider = agentOnline
    ? "groq-agent"
    : hasGroq
      ? "groq-cloud"
      : process.env.GEMINI_API_KEY
        ? "gemini"
        : process.env.OPENAI_API_KEY
          ? "openai"
          : "built-in";

  send(res, {
    restaurantName: ctx.restaurantName,
    currency: ctx.currency,
    provider,
    agentOnline: agentOnline || hasGroq,
    metrics: {
      todayRevenue: ctx.today.current?.revenue ?? 0,
      todayOrders: ctx.today.current?.totalOrders ?? 0,
      ongoingOrders: ongoingCount,
      lowStockCount: (ctx.today.lowStock || []).length,
      topDish: ctx.month.topMeals?.[0] || null,
    },
  });
});

const chat = asyncWrapper(async (req, res, next) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return next(fail("Message is required", 400));

  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const ctx = await loadRestaurantContext();

  let reply = null;
  let provider = "built-in";

  if (process.env.GROQ_API_KEY || process.env.ARIA_GROQ_API_KEY) {
    try {
      reply = await callGroq(message, history, ctx);
      if (reply) provider = "groq";
    } catch {
      reply = null;
    }
  } else if (process.env.GEMINI_API_KEY) {
    try {
      reply = await callGemini(message, history, ctx);
      if (reply) provider = "gemini";
    } catch {
      reply = null;
    }
  } else if (process.env.OPENAI_API_KEY) {
    try {
      reply = await callOpenAI(message, history, ctx);
      if (reply) provider = "openai";
    } catch {
      reply = null;
    }
  }

  if (!reply) {
    reply = buildLocalReply(message, ctx);
    provider = "built-in";
  }

  send(res, { reply, provider });
});

const chatStream = asyncWrapper(async (req, res, next) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return next(fail("Message is required", 400));

  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const ac = new AbortController();
  const connectTimer = setTimeout(() => ac.abort(), 4000);
  let clientClosed = false;
  req.on("close", () => {
    clientClosed = true;
    ac.abort();
  });

  try {
    const agentRes = await fetch(`${AGENT_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": process.env.AGENT_SECRET || "",
      },
      body: JSON.stringify({ message, history }),
      signal: ac.signal,
    });
    clearTimeout(connectTimer);

    if (!agentRes.ok || !agentRes.body) {
      throw new Error(`Agent returned HTTP ${agentRes.status}`);
    }

    const reader = agentRes.body.getReader();
    while (!clientClosed) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch {
    clearTimeout(connectTimer);
    if (clientClosed) return;
    try {
      const ctx = await loadRestaurantContext();
      let reply = null;
      let provider = "built-in";

      if (process.env.GROQ_API_KEY || process.env.ARIA_GROQ_API_KEY) {
        try {
          writeSse(res, "status", { text: "Analyzing live restaurant metrics..." });
          reply = await callGroq(message, history, ctx);
          if (reply) provider = "groq";
        } catch {
          reply = null;
        }
      }

      if (!reply) {
        reply = buildLocalReply(message, ctx);
        provider = "built-in";
      }

      writeSse(res, "token", { text: reply });
      writeSse(res, "done", { provider, tools: [] });
    } catch {
      writeSse(res, "error", { message: "Failed to generate AI response" });
    }
    res.end();
  }
});

export default { getBriefing, chat, chatStream };
