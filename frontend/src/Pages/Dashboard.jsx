import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Banknote, Receipt, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { fetchDashboard } from "../Redux/Slices/dashboardSlice.js";
import { STATUS_META } from "../Utils/constants.js";
import { daysAgoISO, num, todayYMD } from "../Utils/format.js";
import useMoney from "../Hooks/useMoney.js";
import { Card, EmptyState, PageHeader, Pill, Skeleton, StatCard } from "../Components/ui/Display.jsx";
import DataTable from "../Components/ui/DataTable.jsx";

const PRESETS = [{ key: "today", label: "Today" }, { key: "7d", label: "7 days" }, { key: "30d", label: "30 days" }];

const tip = { background: "var(--c-surface)", border: "1px solid var(--c-line)", borderRadius: 12, fontSize: 12 };

export default function Dashboard() {
  const dispatch = useDispatch();
  const fmt = useMoney();
  const tz = useSelector((s) => s.settings.data?.timezone);
  const { data, loading, error } = useSelector((s) => s.dashboard);
  const [preset, setPreset] = useState("today");

  useEffect(() => {
    const now = new Date().toISOString();
    const params = preset === "today" ? { date: todayYMD(tz) } : { from: daysAgoISO(preset === "7d" ? 7 : 30), to: now };
    dispatch(fetchDashboard(params));
  }, [dispatch, preset, tz]);

  const c = data?.current;
  const ch = data?.change || {};

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Compared with the previous period of the same length"
        actions={
          <div className="flex rounded-xl border border-line bg-surface p-1 shadow-xs">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  preset === p.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:text-ink hover:bg-primary-soft/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />
      {error && <p className="mb-4 rounded-xl bg-brick-soft px-4 py-3 text-sm text-brick">{error}</p>}

      {!c ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard index={0} icon={Banknote} label="Revenue" value={fmt(c.revenue)} delta={ch.revenue} />
            <StatCard index={1} icon={ShoppingBag} label="Orders" value={num(c.totalOrders, 0)} delta={ch.totalOrders} accent="primary" />
            <StatCard index={2} icon={Receipt} label="Average order" value={fmt(c.avgOrderValue)} delta={ch.avgOrderValue} />
            <StatCard index={3} icon={TrendingUp} label="Gross profit" value={fmt(c.grossProfit)} delta={ch.grossProfit} />
            <StatCard index={4} icon={Wallet} label="Expenses" value={fmt(c.expenses)} delta={ch.expenses} accent="primary" />
            <StatCard index={5} icon={TrendingUp} label="Net profit" value={fmt(c.netProfit)} delta={ch.netProfit} accent={c.netProfit < 0 ? "brick" : "primary"} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(data.ongoingOrders).map(([s, n]) => <Pill key={s} className={STATUS_META[s].pill}>{STATUS_META[s].label}: {n}</Pill>)}
            {!Object.keys(data.ongoingOrders).length && <span className="text-sm text-muted">No open orders right now</span>}
            {data.notifications.map((n) => (
              <Link key={n.type} to={n.type === "sync_issues" ? "/sync" : "/inventory"} className="inline-flex items-center gap-1.5 rounded-full bg-brick-soft px-2.5 py-0.5 text-xs font-semibold text-brick">
                <AlertTriangle className="size-3.5" />{n.type === "sync_issues" ? `${n.count} sync issues` : `${n.count} low-stock items`}
              </Link>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-bold">Sales</h2>
              
              {data.salesTrend.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.salesTrend}>
                    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2F6B4F" stopOpacity={0.45} /><stop offset="100%" stopColor="#2F6B4F" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--c-muted)" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--c-muted)" }} width={48} />
                    <Tooltip contentStyle={tip} formatter={(v) => fmt(v)} />
                    <Area type="monotone" dataKey="revenue" stroke="#2F6B4F" strokeWidth={2.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No paid orders in this period" />}
            </Card>
            <Card>
              <h2 className="mb-4 font-bold">Expenses</h2>
              {data.expenseTrend.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.expenseTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--c-muted)" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--c-muted)" }} width={48} />
                    <Tooltip contentStyle={tip} formatter={(v) => fmt(v)} />
                    <Bar dataKey="total" fill="#7FB394" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No expenses in this period" />}
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {[["Best sellers", data.topMeals], ["Slowest sellers", data.bottomMeals]].map(([title, list]) => (
              <Card key={title}>
                <h2 className="mb-3 font-bold">{title}</h2>
                {list.length ? list.map((m) => (
                  <div key={m._id} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
                    <span className="font-medium">{m.name}</span><span className="text-muted">{m.quantity} sold · {fmt(m.revenue)}</span>
                  </div>
                )) : <p className="text-sm text-muted">No sales yet</p>}
                
              </Card>
            ))}
            <Card>
              <h2 className="mb-3 flex items-center gap-2 font-bold"><AlertTriangle className="size-4 text-brick" />Low stock</h2>
              {data.lowStock.length ? data.lowStock.slice(0, 8).map((i) => (
                <div key={i._id} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
                  <span className="font-medium">{i.name}</span><span className="font-semibold text-brick">{num(i.quantity, 3)} {i.unit}</span>
                </div>
              )) : <p className="text-sm text-muted">Everything is above its alert level</p>}
            </Card>
          </div>

          <div className="mt-5">
            <h2 className="mb-3 font-bold">Employee performance</h2>
            <DataTable
              rows={data.employees.map((e) => ({ ...e, _id: String(e._id) }))}
              columns={[
                { key: "name", label: "Employee", render: (e) => <span className="font-semibold">{e.name || "—"}</span> },
                { key: "orders", label: "Orders" },
                { key: "revenue", label: "Revenue", align: "right", render: (e) => fmt(e.revenue) },
              ]}
              empty="No sales yet"
            />
          </div>
        </div>
      )}
    </>
  );
}
