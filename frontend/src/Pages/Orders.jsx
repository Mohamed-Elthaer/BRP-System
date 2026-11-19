import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ClipboardList } from "lucide-react";
import { fetchOrders } from "../Redux/Slices/ordersSlice.js";
import { ORDER_TYPES, PAYMENT_META, STATUS_META } from "../Utils/constants.js";
import { dt, fullName } from "../Utils/format.js";
import useDebounce from "../Hooks/useDebounce.js";
import useMoney from "../Hooks/useMoney.js";
import DataTable, { Pagination } from "../Components/ui/DataTable.jsx";
import { Pill, PageHeader } from "../Components/ui/Display.jsx";
import { Input, SearchInput, Select } from "../Components/ui/Fields.jsx";

const STATUS_CHIPS = ["", "new", "preparing", "ready", "served", "completed", "cancelled"];

export default function Orders() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fmt = useMoney();
  const { items, meta, loading, liveTick } = useSelector((s) => s.orders);
  const [f, setF] = useState({ status: "", orderType: "", paymentStatus: "", origin: "", from: "", to: "", search: "" });
  const [page, setPage] = useState(1);
  const search = useDebounce(f.search);
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setPage(1); };

  // بنعمل refetch مع أي حدث socket (order:created / order:updated)
  useEffect(() => {
    dispatch(fetchOrders({ page, limit: 20, ...f, search }));
  }, [dispatch, page, f.status, f.orderType, f.paymentStatus, f.origin, f.from, f.to, search, liveTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { key: "orderNumber", label: "Order", render: (o) => <span className="font-bold">#{o.orderNumber}</span> },
    { key: "orderType", label: "Type", render: (o) => <span>{ORDER_TYPES.find((t) => t.key === o.orderType)?.label}{o.tableNumber ? ` · T${o.tableNumber}` : ""}{o.origin === "offline_sync" && <span className="ml-1 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">OFFLINE</span>}</span> },
    { key: "items", label: "Items", render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
    { key: "total", label: "Total", render: (o) => <span className="font-semibold">{fmt(o.total)}</span> },
    { key: "paymentStatus", label: "Payment", render: (o) => <Pill className={PAYMENT_META[o.paymentStatus].pill}>{PAYMENT_META[o.paymentStatus].label}</Pill> },
    { key: "status", label: "Status", render: (o) => <Pill className={STATUS_META[o.status].pill}>{STATUS_META[o.status].label}</Pill> },
    { key: "createdBy", label: "By", render: (o) => fullName(o.createdBy) || "—" },
    { key: "createdAt", label: "Created", render: (o) => <span className="text-muted">{dt(o.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Orders" subtitle="Live list. It refreshes when anything changes" />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STATUS_CHIPS.map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setF((p) => ({ ...p, status: s })); setPage(1); }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              f.status === s
                ? "bg-primary text-white shadow-sm"
                : "border border-line bg-surface text-ink hover:bg-primary-soft hover:border-primary/40"
            }`}
          >
            {s ? STATUS_META[s].label : "All"}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <SearchInput value={f.search} onChange={(v) => { setF((p) => ({ ...p, search: v })); setPage(1); }} placeholder="Order #, name, phone" className="lg:col-span-2" />
        <Select value={f.orderType} onChange={set("orderType")} placeholder="All types" options={ORDER_TYPES.map((t) => ({ value: t.key, label: t.label }))} />
        <Select value={f.paymentStatus} onChange={set("paymentStatus")} placeholder="Any payment" options={Object.entries(PAYMENT_META).map(([value, m]) => ({ value, label: m.label }))} />
        <Select value={f.origin} onChange={set("origin")} placeholder="Any source" options={[{ value: "online", label: "Online" }, { value: "offline_sync", label: "Synced offline" }]} />
        <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-6 lg:grid-cols-[200px_200px]">
          <Input type="date" aria-label="From" value={f.from} onChange={set("from")} />
          <Input type="date" aria-label="To" value={f.to} onChange={set("to")} />
        </div>
      </div>
      <DataTable columns={columns} rows={items} loading={loading} empty="No orders match" emptyIcon={ClipboardList} onRowClick={(o) => navigate(`/orders/${o._id}`)} />
      <Pagination meta={meta} onChange={setPage} />
    </>
  );
}
