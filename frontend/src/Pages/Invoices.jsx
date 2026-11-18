import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Receipt } from "lucide-react";
import { fetchInvoices } from "../Redux/Slices/invoicesSlice.js";
import { getInvoice } from "../Api/invoiceApi.js";
import { dt, money } from "../Utils/format.js";
import useDebounce from "../Hooks/useDebounce.js";
import DataTable, { Pagination } from "../Components/ui/DataTable.jsx";
import { Badge, PageHeader } from "../Components/ui/Display.jsx";
import { Input, SearchInput } from "../Components/ui/Fields.jsx";
import { ReceiptModal } from "../Components/pos/Receipt.jsx";

export default function Invoices() {
  const dispatch = useDispatch();
  const { items, meta, loading } = useSelector((s) => s.invoices);
  const [f, setF] = useState({ search: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const search = useDebounce(f.search);

  useEffect(() => { dispatch(fetchInvoices({ page, limit: 20, search, from: f.from, to: f.to })); }, [dispatch, page, search, f.from, f.to]);

  const view = async (row) => {
    try { setOpen(await getInvoice(row._id)); } catch { toast.error("Failed to load invoice"); }
  };

  const columns = [
    { key: "invoiceNumber", label: "Invoice", render: (i) => <span className="font-bold">{i.invoiceNumber}</span> },
    { key: "orderNumber", label: "Order", render: (i) => `#${i.orderNumber}` },
    { key: "paymentMethod", label: "Method", className: "capitalize" },
    { key: "total", label: "Total", render: (i) => <span className="font-semibold">{money(i.total, i.currency)}</span> },
    { key: "status", label: "Status", render: (i) => <Badge tone={i.status === "refunded" ? "danger" : "success"}>{i.status}</Badge> },
    { key: "createdAt", label: "Date", render: (i) => <span className="text-muted">{dt(i.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Invoices" subtitle="Frozen copies of each paid order" />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_170px_170px]">
        <SearchInput value={f.search} onChange={(v) => { setF({ ...f, search: v }); setPage(1); }} placeholder="Invoice or order number" />
        <Input type="date" aria-label="From" value={f.from} onChange={(e) => { setF({ ...f, from: e.target.value }); setPage(1); }} />
        <Input type="date" aria-label="To" value={f.to} onChange={(e) => { setF({ ...f, to: e.target.value }); setPage(1); }} />
      </div>
      <DataTable columns={columns} rows={items} loading={loading} empty="No invoices yet" emptyIcon={Receipt} onRowClick={view} />
      <Pagination meta={meta} onChange={setPage} />
      <ReceiptModal invoice={open} onClose={() => setOpen(null)} />
    </>
  );
}
