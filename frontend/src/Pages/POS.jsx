import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Minus, Plus, Search, ShoppingCart, Trash2, UtensilsCrossed, WifiOff } from "lucide-react";
import { fetchMenu } from "../Redux/Slices/menuSlice.js";
import { fetchCategories } from "../Redux/Slices/categoriesSlice.js";
import { addItem, clearCart, removeItem, setDiscount, setField, setItemNotes, setOrderType, setQty, submitOrder } from "../Redux/Slices/posSlice.js";
import { previewTotals } from "../Utils/calcTotals.js";
import { FIELD_LABELS, ORDER_TYPES } from "../Utils/constants.js";
import useMoney from "../Hooks/useMoney.js";
import useOnlineStatus from "../Hooks/useOnlineStatus.js";
import Button from "../Components/ui/Button.jsx";
import Modal from "../Components/ui/Modal.jsx";
import { Input, Select } from "../Components/ui/Fields.jsx";
import { EmptyState, Skeleton } from "../Components/ui/Display.jsx";
import PaymentModal from "../Components/pos/PaymentModal.jsx";
import { ReceiptModal } from "../Components/pos/Receipt.jsx";

export default function POS() {
  const dispatch = useDispatch();
  const fmt = useMoney();
  const online = useOnlineStatus();
  const { items: menu, loading } = useSelector((s) => s.menu);
  const categories = useSelector((s) => s.category.items);
  const settings = useSelector((s) => s.settings.data);
  const pos = useSelector((s) => s.pos);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => { dispatch(fetchMenu()); dispatch(fetchCategories()); }, [dispatch]);

  const types = useMemo(() => {
    const enabled = settings?.orderTypes?.filter((t) => t.enabled);
    return enabled?.length ? enabled : ORDER_TYPES.map((t) => ({ ...t, requiredFields: [] }));
  }, [settings]);
  useEffect(() => {
    if (!types.some((t) => t.key === pos.orderType)) dispatch(setOrderType(types[0].key));
  }, [types, pos.orderType, dispatch]);

  const typeCfg = types.find((t) => t.key === pos.orderType) || types[0];
  const totals = previewTotals({ items: pos.items, orderType: pos.orderType, discount: pos.discount, settings });
  const count = pos.items.reduce((s, i) => s + i.quantity, 0);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return menu.filter((m) => (cat === "all" || m.category?._id === cat) && (!term || m.name.toLowerCase().includes(term)));
  }, [menu, cat, q]);

  const send = async (payment) => {
    if (!pos.items.length) return toast.error("Add at least one item");
    const missing = typeCfg.requiredFields.find((k) => !String(pos.fields[k] || "").trim());
    if (missing) return toast.error(`${FIELD_LABELS[missing]} is required`);

    const payload = {
      orderType: pos.orderType,
      items: pos.items.map((i) => ({ menuItem: i.menuItem, quantity: i.quantity, notes: i.notes || undefined })),
      notes: pos.fields.notes || undefined,
    };
    typeCfg.requiredFields.forEach((k) => { payload[k] = pos.fields[k]; });
    if (Number(pos.discount.value) > 0) payload.discount = { type: pos.discount.type, value: Number(pos.discount.value) };
    if (payment) payload.payment = payment;

    try {
      const res = await dispatch(submitOrder(payload)).unwrap();
      dispatch(clearCart());
      setPayOpen(false);
      setCartOpen(false);
      if (res.queued) toast.info("No connection. Order saved on this device and will sync automatically.");
      else {
        toast.success(`Order #${res.order.orderNumber} ${payment ? "paid" : "sent to kitchen"}`);
        if (res.invoice) setReceipt(res.invoice);
      }
    } catch (err) {
      toast.error(err);
    }
  };

  const cart = (
    <div className="flex h-full flex-col">
      <div className="mb-3 grid gap-1 rounded-xl bg-bg p-1" style={{ gridTemplateColumns: `repeat(${types.length}, 1fr)` }}>
        {types.map((t) => (
          <button key={t.key} onClick={() => dispatch(setOrderType(t.key))} className={`rounded-lg cursor-pointer px-2 py-2 text-xs font-bold transition ${pos.orderType === t.key ? "bg-saffron text-[#2A2622] shadow" : "text-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </div>

      <div className="grid gap-2">
        {typeCfg.requiredFields.map((k) => (
          <Input key={k} placeholder={FIELD_LABELS[k]} value={pos.fields[k]} onChange={(e) => dispatch(setField({ name: k, value: e.target.value }))} />
        ))}
      </div>

      <div className="my-3 min-h-24 flex-1 space-y-2 overflow-y-auto">
        {!pos.items.length && <EmptyState icon={ShoppingCart} title="Cart is empty" hint="Tap a dish to add it" />}
        {pos.items.map((i) => (
          <motion.div layout key={i.menuItem} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl  border border-line p-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold r">{i.name}</p>
              <button onClick={() => dispatch(removeItem(i.menuItem))} aria-label="Remove" className="text-muted cursor-pointer hover:text-brick"><Trash2 className="size-4" /></button>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={() => dispatch(setQty({ id: i.menuItem, quantity: i.quantity - 1 }))} aria-label="Decrease" className="grid size-7 cursor-pointer place-items-center rounded-lg border border-line hover:bg-primary-soft"><Minus className="size-3.5" /></button>
                <span className="w-7 text-center text-sm font-bold">{i.quantity}</span>
                <button onClick={() => dispatch(setQty({ id: i.menuItem, quantity: i.quantity + 1 }))} aria-label="Increase" className="grid size-7 cursor-pointer place-items-center rounded-lg border border-line hover:bg-primary-soft"><Plus className="size-3.5" /></button>
              </div>
              <span className="text-sm font-bold text-brand">{fmt(i.price * i.quantity)}</span>
            </div>
            <input value={i.notes} onChange={(e) => dispatch(setItemNotes({ id: i.menuItem, notes: e.target.value }))} placeholder="Note (no onions…)" maxLength={200} className="mt-2 w-full rounded-lg border border-line bg-transparent px-2 py-1 text-xs outline-none focus:border-primary" />
          </motion.div>
        ))}
      </div>

      <div className="space-y-3 border-t border-line pt-3">
        <div className="grid grid-cols-[110px_1fr] gap-2 ">
          <Select className="cursor-pointer" value={pos.discount.type} onChange={(e) => dispatch(setDiscount({ type: e.target.value }))} options={[{ value: "percent", label: "% off" }, { value: "fixed", label: "Fixed off" }]} />
          <Input type="number" min={0} step="any" placeholder="Discount" value={pos.discount.value} onChange={(e) => dispatch(setDiscount({ value: e.target.value }))} />
        </div>
        <div className="space-y-1 text-sm ">
          <div className="flex justify-between text-muted"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
          {totals.discount > 0 && <div className="flex justify-between text-muted"><span>Discount</span><span>-{fmt(totals.discount)}</span></div>}
          {totals.service.amount > 0 && <div className="flex justify-between text-muted"><span>Service {totals.service.rate}%</span><span>{fmt(totals.service.amount)}</span></div>}
          {totals.tax.amount > 0 && <div className="flex justify-between text-muted"><span>Tax {totals.tax.rate}%</span><span>{fmt(totals.tax.amount)}</span></div>}
          <div className="flex justify-between pt-1 text-lg font-extrabold"><span>Total</span><span className="text-brand">{fmt(totals.total)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button className="cursor-pointer" variant="outline" size="lg" disabled={!pos.items.length} loading={pos.submitting && !payOpen} onClick={() => send()}>Send to kitchen</Button>
          <Button className=" cursor-pointer " variant="saffron" size="lg" disabled={!pos.items.length} onClick={() => setPayOpen(true)}>Pay & complete</Button>
        </div>
        <p className="text-center text-[11px] text-muted">Final total is calculated by the server.</p>
      </div>
    </div>
  );

  return (
    <>
      {!online && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-brick-soft px-4 py-2.5 text-sm font-semibold text-brick">
          <WifiOff className="size-4" /> You&apos;re offline. Orders are saved on this device and sent when the connection returns.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes…" className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {[{ _id: "all", name: "All" }, ...categories.filter((c) => c.isActive)].map((c) => (
              <button key={c._id} onClick={() => setCat(c._id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c._id ? "bg-saffron text-[#2A2622]" : "border border-line bg-surface hover:bg-primary-soft"}`}>{c.name}</button>
            ))}
          </div>

          {loading && !menu.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
          ) : !visible.length ? (
            <EmptyState icon={UtensilsCrossed} title="No dishes found" hint="Try another category or search." />
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((m, idx) => (
                <motion.button
                  key={m._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  whileHover={m.isAvailable ? { y: -3 } : undefined}
                  whileTap={m.isAvailable ? { scale: 0.96 } : undefined}
                  disabled={!m.isAvailable}
                  onClick={() => dispatch(addItem(m))}
                  className={`relative overflow-hidden rounded-2xl border border-line bg-surface text-left transition ${m.isAvailable ? "hover:border-primary/60 hover:shadow-md" : "opacity-50"}`}
                >
                  {m.image?.url ? <img src={m.image.url} alt="" className="h-24 w-full object-cover" /> : <div className="grid h-24 place-items-center bg-primary-soft text-brand"><UtensilsCrossed className="size-8" /></div>}
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{m.name}</p>
                    <p className="mt-1 font-extrabold text-brand">{fmt(m.price)}</p>
                  </div>
                  {!m.isAvailable && <span className="absolute left-2 top-2 rounded-full bg-brick px-2 py-0.5 text-[10px] font-bold text-white">Unavailable</span>}
                </motion.button>
              ))}
            </motion.div>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100dvh-7rem)] rounded-2xl border border-line bg-surface p-4">{cart}</div>
        </aside>
      </div>

      {/* موبايل: شريط سلة سفلي + sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur lg:hidden">
        <Button size="lg" className="w-full" onClick={() => setCartOpen(true)} icon={ShoppingCart}>
          {count ? `${count} item${count > 1 ? "s" : ""} · ${fmt(totals.total)}` : "Cart is empty"}
        </Button>
      </div>
      <div className="h-16 lg:hidden" />
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Current order" size="md"><div className="min-h-[60dvh]">{cart}</div></Modal>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} total={totals.total} loading={pos.submitting} onConfirm={send} />
      <ReceiptModal invoice={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
