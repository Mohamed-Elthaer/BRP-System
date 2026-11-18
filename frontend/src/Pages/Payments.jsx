import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { fetchPayments } from "../Redux/Slices/paymentsSlice.js";
import { dt, fullName } from "../Utils/format.js";
import useMoney from "../Hooks/useMoney.js";
import DataTable, { Pagination } from "../Components/ui/DataTable.jsx";
import { Badge, PageHeader } from "../Components/ui/Display.jsx";
import { Input, Select } from "../Components/ui/Fields.jsx";

export default function Payments() {
  const dispatch = useDispatch();
  const fmt = useMoney();
  const methods = useSelector((s) => s.settings.data?.paymentMethods || []);
  const { items, meta, loading } = useSelector((s) => s.payments);
  const [f, setF] = useState({ method: "", status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };

  useEffect(() => { dispatch(fetchPayments({ page, limit: 20, ...f })); }, [dispatch, page, f.method, f.status, f.from, f.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { key: "order", label: "Order", render: (p) => <Link to={`/orders/${p.order?._id}`} className="font-bold text-brand hover:underline">#{p.order?.orderNumber}</Link> },
    { key: "amount", label: "Amount", render: (p) => <span className="font-semibold">{fmt(p.amount)}</span> },
    { key: "method", label: "Method", className: "capitalize" },
    { key: "status", label: "Status", render: (p) => <Badge tone={p.status === "refunded" ? "danger" : "success"}>{p.status}</Badge> },
    { key: "receivedBy", label: "Received by", render: (p) => fullName(p.receivedBy) || "—" },
    { key: "paidAt", label: "Paid at", render: (p) => <span className="text-muted">{dt(p.paidAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Payments" subtitle="Every payment and refund" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={f.method} onChange={set("method")} placeholder="All methods" options={methods.map((m) => ({ value: m.key, label: m.label || m.key }))} />
        <Select value={f.status} onChange={set("status")} placeholder="Any status" options={[{ value: "completed", label: "Completed" }, { value: "refunded", label: "Refunded" }]} />
        <Input type="date" aria-label="From" value={f.from} onChange={set("from")} />
        <Input type="date" aria-label="To" value={f.to} onChange={set("to")} />
      </div>
      <DataTable columns={columns} rows={items} loading={loading} empty="No payments yet" emptyIcon={CreditCard} />
      <Pagination meta={meta} onChange={setPage} />
    </>
  );
}
