import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Bot, Flame, Loader2, Maximize2, Minimize2, RotateCcw, Send, Sparkles, TrendingUp, User, UtensilsCrossed,
} from "lucide-react";
import { toast } from "react-toastify";
import { getBriefing, streamAiMessage } from "../Api/aiApi.js";
import { Badge, Card, PageHeader, Skeleton } from "../Components/ui/Display.jsx";
import Button from "../Components/ui/Button.jsx";

const SUGGESTIONS = [
  "إيه أخبار المطعم النهاردة؟ وإيه محتاج انتباهي؟",
  "إيه الأصناف الأعلى مبيعاً والأقل هامش ربح؟",
  "إيه نواقص المخزون وتكلفة إعادة الشراء؟",
  "إيه ساعات الذروة وأسباب إلغاء الأوردرات؟",
  "Summarize today's sales, profits & top dishes",
  "Which low-stock ingredients need reordering?",
];

const WELCOME_MSG = {
  id: "welcome",
  role: "assistant",
  content:
    "أهلاً بك! أنا **المساعد الذكي للمطعم** — شايف كل بيانات المبيعات، الأرباح، المنيو، المخزون، المصروفات، المطبخ، والموظفين لحظة بلحظة.\nاسألني أي سؤال بالعربي أو الإنجليزي وهجيب لك الأرقام الحقيقية مع توصيات عملية.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

function renderInline(text) {
  const tokens = String(text || "").split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return <strong key={i} className="font-bold">{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-line/60 px-1.5 py-0.5 font-mono text-xs">
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function isTableRow(line) {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

function isTableSep(line) {
  return /^\|[\s:-]+\|/.test(line.trim()) && !/[A-Za-z0-9\u0600-\u06FF]/.test(line);
}

function parseCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function MarkdownMessage({ text }) {
  const lines = String(text || "").split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown Table
    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = parseCells(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(parseCells(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`tbl-${i}`} dir="auto" className="my-2 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line bg-primary-soft/60 text-brand">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 text-start font-bold whitespace-nowrap">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-line/60 last:border-b-0">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 align-top">
                      {renderInline(row[cIdx] || "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="my-2 border-line" />);
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level <= 2 ? "text-base font-extrabold mt-2" : "text-sm font-bold mt-2";
      blocks.push(
        <p key={`h-${i}`} dir="auto" className={cls}>
          {renderInline(headingMatch[2])}
        </p>
      );
      i++;
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} dir="auto" className="list-disc space-y-1 ps-5 text-sm">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} dir="auto" className="list-decimal space-y-1 ps-5 text-sm">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} dir="auto" className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1.5">{blocks}</div>;
}

export default function AIAssistant() {
  const [briefing, setBriefing] = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    getBriefing()
      .then((data) => {
        setBriefing(data);
        setActiveProvider(data?.provider || null);
      })
      .catch(() => {})
      .finally(() => setLoadingBriefing(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { id: `u-${Date.now()}`, role: "user", content: text, time: now };
    const assistantId = `a-${Date.now() + 1}`;
    const placeholderMsg = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "",
      streaming: true,
      time: now,
    };

    const history = messages
      .filter((m) => m.id !== "welcome" && m.content)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMsg, placeholderMsg]);
    if (!textOverride) setInput("");
    setSending(true);

    try {
      await streamAiMessage({
        message: text,
        history,
        onStatus: (statusText) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, status: statusText } : m))
          );
        },
        onToken: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        onDone: (meta) => {
          if (meta?.provider) setActiveProvider(meta.provider);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    status: "",
                    streaming: false,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  }
                : m
            )
          );
        },
        onError: (errMsg) => {
          toast.error(errMsg || "AI stream error");
        },
      });
    } catch (err) {
      toast.error(err?.message || "Failed to get AI response");
      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantId && !m.content))
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, status: "", streaming: false } : m))
      );
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () =>
    setMessages([{ ...WELCOME_MSG, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);

  const m = briefing?.metrics;
  const currency = briefing?.currency || "EGP";

  const providerLabel = activeProvider?.startsWith("groq")
    ? "AI Agent Connected"
    : activeProvider === "built-in"
      ? "Live ERP Fallback"
      : activeProvider
        ? activeProvider.toUpperCase()
        : null;

  return (
    <div className="space-y-3">
      <PageHeader
        title="AI Assistant"
        subtitle="Smart insights & live Q&A powered by your restaurant data"
        actions={
          <div className="flex items-center gap-2">
            {providerLabel && (
              <Badge tone={activeProvider === "built-in" ? "warn" : "success"} className="gap-1 px-3 py-1">
                <Sparkles className="size-3.5" />
                {providerLabel}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={expanded ? Minimize2 : Maximize2}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Compact" : "Expand"}
            </Button>
            <Button variant="outline" size="sm" icon={RotateCcw} onClick={clearChat}>
              Clear chat
            </Button>
          </div>
        }
      />

      {/* Live Snapshot */}
      {!expanded && (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {loadingBriefing ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
          ) : (
            <>
              <Card className="flex items-center gap-3 !p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-brand">
                  <TrendingUp className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">Today's Revenue</p>
                  <p className="truncate text-sm font-extrabold">
                    {Number(m?.todayRevenue || 0).toLocaleString()} {currency}
                  </p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 !p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Flame className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">Active Orders</p>
                  <p className="truncate text-sm font-extrabold">{m?.ongoingOrders ?? 0}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 !p-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    m?.lowStockCount > 0 ? "bg-brick-soft text-brick" : "bg-primary-soft text-brand"
                  }`}
                >
                  <AlertTriangle className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">Low Stock Alerts</p>
                  <p className="truncate text-sm font-extrabold">{m?.lowStockCount ?? 0}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 !p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-brand">
                  <UtensilsCrossed className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">Top Dish (30d)</p>
                  <p className="truncate text-sm font-extrabold">{m?.topDish?.name || "—"}</p>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Chat Container */}
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-surface ${
          expanded ? "h-[calc(100dvh-9.5rem)] min-h-[640px]" : "h-[calc(100dvh-13.5rem)] min-h-[580px]"
        }`}
      >
        {/* Suggested prompts */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-xs font-semibold text-muted">Try asking:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={sending}
              onClick={() => send(s)}
              className="shrink-0 cursor-pointer rounded-full border border-line bg-bg px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-xl ${
                    isUser ? "bg-primary text-white shadow-xs" : "bg-primary-soft text-primary"
                  }`}
                >
                  {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                </span>
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 ${
                    isUser ? "bg-primary text-white" : "border border-line bg-bg text-ink"
                  }`}
                >
                  {!isUser && msg.status && (
                    <div
                      dir="auto"
                      className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-brand"
                    >
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>{msg.status}</span>
                    </div>
                  )}

                  {msg.content ? (
                    isUser ? (
                      <p dir="auto" className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    ) : (
                      <MarkdownMessage text={msg.content} />
                    )
                  ) : (
                    msg.streaming &&
                    !msg.status && (
                      <span className="inline-flex items-center gap-1.5 py-1">
                        <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                        <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                        <span className="size-2 animate-bounce rounded-full bg-primary" />
                      </span>
                    )
                  )}

                  <p className={`mt-1.5 text-[10px] ${isUser ? "text-right text-white/70" : "text-muted"}`}>
                    {msg.time}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-line bg-surface p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <textarea
              dir="auto"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسأل عن المبيعات، الأرباح، المخزون، المنيو، الطلبات، أو المصروفات…"
              className="max-h-36 min-h-[52px] flex-1 resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <Button icon={Send} loading={sending} disabled={!input.trim()} onClick={() => send()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
