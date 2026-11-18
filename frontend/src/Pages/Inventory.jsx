import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Boxes, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { addPurchase, fetchStock, fetchTransactions, recordWaste, submitStocktake } from "../Redux/Slices/inventorySlice.js";
import { fetchSuppliers } from "../Redux/Slices/suppliersSlice.js";
import { PERM, TX_TYPES } from "../Utils/constants.js";
import { dt, fullName, num } from "../Utils/format.js";
import { getSocket } from "../Utils/socket.js";
import usePermission from "../Hooks/usePermission.js";
import useMoney from "../Hooks/useMoney.js";
import useDebounce from "../Hooks/useDebounce.js";
import Button from "../Components/ui/Button.jsx";
import Modal from "../Components/ui/Modal.jsx";
import Tabs from "../Components/ui/Tabs.jsx";
import DataTable, { Pagination } from "../Components/ui/DataTable.jsx";
import { Badge, PageHeader } from "../Components/ui/Display.jsx";
import { Input, SearchInput, Select, Switch, Textarea } from "../Components/ui/Fields.jsx";

export default function Inventory() {
  const dispatch = useDispatch();
  const fmt = useMoney();
  const { can } = usePermission();
  const manage = can(PERM.INVENTORY_MANAGE);
  const { items, totalValue, loading } = useSelector((s) => s.inventory);
  const tx = useSelector((s) => s.inventoryTx);
  const suppliers = useSelector((s) => s.supplier.items).filter((s) => s.isActive);
  const [tab, setTab] = useState("stock");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [txf, setTxf] = useState({ type: "", ingredient: "" });
  const [txPage, setTxPage] = useState(1);
  const [modal, setModal] = useState(null); // purchase | waste | stocktake
  const [form, setForm] = useState({});
  const [counts, setCounts] = useState({});
  const [variances, setVariances] = useState(null);
  const [saving, setSaving] = useState(false);
  const q = useDebounce(search);

  const load = () => dispatch(fetchStock({ search: q, lowStock: lowOnly ? "true" : "" }));
  useEffect(() => { load(); }, [q, lowOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { dispatch(fetchSuppliers()); }, [dispatch]);
  useEffect(() => { if (tab === "tx") dispatch(fetchTransactions({ page: txPage, limit: 20, ...txf })); }, [dispatch, tab, txPage, txf]);

  // تحديث لحظي من الباك
  useEffect(() => {
    const s = getSocket();
    const onUpdated = () => { load(); };
    s.on("inventory:updated", onUpdated);
    return () => s.off("inventory:updated", onUpdated);
  }, [q, lowOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const ingOptions = items.map((i) => ({ value: i._id, label: `${i.name} (${i.unit})` }));
  const open = (m) => { setForm({}); setCounts({}); setVariances(null); setModal(m); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    try {
      if (modal === "purchase") {
        await dispatch(addPurchase({ ingredient: form.ingredient, quantity: Number(form.quantity), unitCost: Number(form.unitCost), supplier: form.supplier || undefined, note: form.note || undefined })).unwrap();
        toast.success("Purchase recorded. Ingredient cost updated");
      } else if (modal === "waste") {
        await dispatch(recordWaste({ ingredient: form.ingredient, quantity: Number(form.quantity), reason: form.reason })).unwrap();
        toast.success("Waste recorded");
      } else {
        const rows = Object.entries(counts).filter(([, v]) => v !== "").map(([ingredient, v]) => ({ ingredient, countedQuantity: Number(v) }));
        if (!rows.length) { toast.error("Enter at least one counted quantity"); setSaving(false); return; }
        const res = await dispatch(submitStocktake({ items: rows, note: form.note })).unwrap();
        setVariances(res.variances.filter((v) => v.difference !== 0));
        toast.success(res.adjusted ? `${res.adjusted} item(s) adjusted` : "Counts match the system");
        load(); setSaving(false); return;
      }
      setModal(null); load();
    } catch (err) { toast.error(err); }
    setSaving(false);
  };

  const stockCols = [
    { key: "name", label: "Ingredient", render: (i) => <span className="font-semibold">{i.name}</span> },
    { key: "quantity", label: "In stock", render: (i) => <span className={`font-bold ${i.isLow ? "text-brick" : ""}`}>{num(i.quantity, 3)} {i.unit}</span> },
    { key: "minStock", label: "Alert at", render: (i) => `${num(i.minStock, 3)} ${i.unit}` },
    { key: "isLow", label: "Level", render: (i) => <Badge tone={i.isLow ? "danger" : "success"}>{i.isLow ? "Low" : "OK"}</Badge> },
    { key: "stockValue", label: "Value", align: "right", render: (i) => fmt(i.stockValue) },
  ];
  const txCols = [
    { key: "createdAt", label: "When", render: (t) => <span className="text-muted">{dt(t.createdAt)}</span> },
    { key: "ingredient", label: "Ingredient", render: (t) => t.ingredient?.name },
    { key: "type", label: "Type", render: (t) => <Badge tone={t.quantity > 0 ? "success" : t.type === "waste" ? "danger" : "warn"} className="capitalize">{t.type}</Badge> },
    { key: "quantity", label: "Change", render: (t) => <span className="font-semibold">{t.quantity > 0 ? "+" : ""}{num(t.quantity, 3)} {t.ingredient?.unit}</span> },
    { key: "balanceAfter", label: "Balance", render: (t) => num(t.balanceAfter, 3) },
    { key: "reason", label: "Reason", render: (t) => <span className="text-muted">{t.reason || t.note || t.supplier?.name || "—"}</span> },
    { key: "createdBy", label: "By", render: (t) => fullName(t.createdBy) || "—" },
  ];

  return (
    <>
      <PageHeader
        title="Stock" subtitle={`Stock value: ${fmt(totalValue)}`}
        actions={manage && <><Button icon={Plus} onClick={() => open("purchase")}>Purchase</Button><Button variant="outline" icon={Trash2} onClick={() => open("waste")}>Waste</Button><Button variant="outline" icon={ClipboardCheck} onClick={() => open("stocktake")}>Stocktake</Button></>}
      />
      <Tabs id="inv" value={tab} onChange={setTab} items={[{ key: "stock", label: "Current stock" }, { key: "tx", label: "History" }]} />

      {tab === "stock" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4"><SearchInput value={search} onChange={setSearch} placeholder="Search ingredients" className="w-full max-w-sm" /><Switch checked={lowOnly} onChange={setLowOnly} label="Low stock only" /></div>
          <DataTable columns={stockCols} rows={items} loading={loading} empty="No ingredients yet. Add some in Ingredients" emptyIcon={Boxes} />
        </>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={txf.type} onChange={(e) => { setTxf({ ...txf, type: e.target.value }); setTxPage(1); }} placeholder="All types" options={TX_TYPES} />
            <Select value={txf.ingredient} onChange={(e) => { setTxf({ ...txf, ingredient: e.target.value }); setTxPage(1); }} placeholder="All ingredients" options={ingOptions} />
          </div>
          <DataTable columns={txCols} rows={tx.items} loading={tx.loading} empty="No stock movements yet" />
          <Pagination meta={tx.meta} onChange={setTxPage} />
        </>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} size={modal === "stocktake" ? "lg" : "md"}
        title={{ purchase: "Record purchase", waste: "Record waste", stocktake: "Stocktake" }[modal] || ""}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>{variances ? "Close" : "Cancel"}</Button>{!variances && <Button loading={saving} onClick={submit}>Save</Button>}</>}>
        {modal === "purchase" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select wrapperClass="sm:col-span-2" label="Ingredient" value={form.ingredient || ""} onChange={set("ingredient")} placeholder="Select…" options={ingOptions} />
            <Input label="Quantity" type="number" min={0} step="any" value={form.quantity || ""} onChange={set("quantity")} />
            <Input label="Unit cost" type="number" min={0} step="any" value={form.unitCost || ""} onChange={set("unitCost")} />
            <Select wrapperClass="sm:col-span-2" label="Supplier (optional)" value={form.supplier || ""} onChange={set("supplier")} placeholder="No supplier" options={suppliers.map((s) => ({ value: s._id, label: s.name }))} />
            <Textarea wrapperClass="sm:col-span-2" label="Note" value={form.note || ""} onChange={set("note")} />
          </div>
        )}
        {modal === "waste" && (
          <div className="grid gap-4">
            <Select label="Ingredient" value={form.ingredient || ""} onChange={set("ingredient")} placeholder="Select…" options={ingOptions} />
            <Input label="Quantity wasted" type="number" min={0} step="any" value={form.quantity || ""} onChange={set("quantity")} />
            <Textarea label="Reason (required)" value={form.reason || ""} onChange={set("reason")} />
          </div>
        )}
        {modal === "stocktake" && (variances ? (
          <div className="space-y-2">
            {!variances.length && <p className="text-sm text-muted">Everything you counted matches the system.</p>}
            {variances.map((v) => (
              <div key={v.ingredient} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                <span className="font-semibold">{v.name}</span>
                <span>{num(v.expected, 3)} → {num(v.counted, 3)} {v.unit} <b className={v.difference < 0 ? "text-brick" : "text-brand"}>({v.difference > 0 ? "+" : ""}{num(v.difference, 3)})</b></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">Enter what you actually counted. Leave blank to skip an item. Differences are saved as adjustments.</p>
            <div className="max-h-[45dvh] space-y-2 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={i._id} className="grid grid-cols-[1fr_120px] items-center gap-3">
                  <span className="text-sm font-medium">{i.name} <span className="text-xs text-muted">(system: {num(i.quantity, 3)} {i.unit})</span></span>
                  <Input type="number" min={0} step="any" placeholder={i.unit} value={counts[i._id] ?? ""} onChange={(e) => setCounts((c) => ({ ...c, [i._id]: e.target.value }))} />
                </div>
              ))}
            </div>
            <Textarea label="Note" value={form.note || ""} onChange={set("note")} />
          </div>
        ))}
      </Modal>
    </>
  );
}
