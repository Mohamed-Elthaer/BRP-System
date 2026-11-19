import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ArrowLeft, Ban, FileText, Undo2 } from "lucide-react";
import { cancelOrderThunk, changeOrderStatus, fetchOrderById, payOrderThunk, refundOrderThunk } from "../Redux/Slices/ordersSlice.js";
import { NEXT_STATUS, PAYMENT_META, PERM, STATUS_META } from "../Utils/constants.js";
import { dt, fullName, uuid } from "../Utils/format.js";
import usePermission from "../Hooks/usePermission.js";
import useMoney from "../Hooks/useMoney.js";
import Button from "../Components/ui/Button.jsx";
import { ConfirmDialog } from "../Components/ui/Modal.jsx";
import { Textarea } from "../Components/ui/Fields.jsx";
import { Card, Pill, Spinner } from "../Components/ui/Display.jsx";
import PaymentModal from "../Components/pos/PaymentModal.jsx";
import { ReceiptModal } from "../Components/pos/Receipt.jsx";

export default function OrderDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const fmt = useMoney();
  const { can } = usePermission();
  const { current, currentLoading, liveTick } = useSelector((s) => s.orders);
  const [dialog, setDialog] = useState(null); // pay | cancel | refund
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => { dispatch(fetchOrderById(id)); }, [dispatch, id, liveTick]);

  if (!current || current.order._id !== id) {
    return <div className="grid min-h-[40dvh] place-items-center">{currentLoading ? <Spinner className="size-8" /> : <Link to="/orders" className="text-brand">Order not found. Back to orders</Link>}</div>;
  }

  const { order, history, payments, invoice: inv } = current;
  const next = NEXT_STATUS[order.status];
  const refresh = () => dispatch(fetchOrderById(id));
  const close = () => { setDialog(null); setReason(""); setRestock(false); };

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); close(); refresh(); } catch (err) { toast.error(err); }
    setBusy(false);
  };

  const canAdvance = can(PERM.ORDERS_UPDATE_STATUS) && next && (!next.needsPaid || order.paymentStatus === "paid");
  const canPay = can(PERM.POS_USE) && order.paymentStatus === "unpaid" && order.status !== "cancelled";
  const canCancel = can(PERM.ORDERS_CANCEL) && !["completed", "cancelled"].includes(order.status);
  const canRefund = can(PERM.ORDERS_CANCEL) && order.paymentStatus === "paid";

  return (
    <>
      <Link to="/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Orders</Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">Order #{order.orderNumber}</h1>
          <Pill className={STATUS_META[order.status].pill}>{STATUS_META[order.status].label}</Pill>
          <Pill className={PAYMENT_META[order.paymentStatus].pill}>{PAYMENT_META[order.paymentStatus].label}</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAdvance && <Button loading={busy} onClick={() => run(() => dispatch(changeOrderStatus({ id, status: next.to })).unwrap(), `Order ${next.to}`)}>{next.label}</Button>}
          {canPay && <Button variant="primary" onClick={() => setDialog("pay")}>Take payment</Button>}
          {inv && <Button variant="outline" icon={FileText} onClick={() => setInvoice(inv)}>Invoice</Button>}
          {canRefund && <Button variant="outline" icon={Undo2} onClick={() => setDialog("refund")}>Refund</Button>}
          {canCancel && <Button variant="danger" icon={Ban} onClick={() => setDialog("cancel")}>Cancel order</Button>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-bold">Items</h2>
            <div className="divide-y divide-line">
              {order.items.map((i) => (
                <div key={i._id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div><p className="font-semibold">{i.quantity} × {i.name}</p>{i.notes && <p className="text-xs text-brand font-medium">“{i.notes}”</p>}</div>
                  <span className="font-semibold">{fmt(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
              {order.discount?.amount > 0 && <div className="flex justify-between text-muted"><span>Discount</span><span>-{fmt(order.discount.amount)}</span></div>}
              {order.serviceCharge?.amount > 0 && <div className="flex justify-between text-muted"><span>Service {order.serviceCharge.rate}%</span><span>{fmt(order.serviceCharge.amount)}</span></div>}
              {order.tax?.amount > 0 && <div className="flex justify-between text-muted"><span>Tax {order.tax.rate}%</span><span>{fmt(order.tax.amount)}</span></div>}
              <div className="flex justify-between pt-1 text-lg font-extrabold"><span>Total</span><span className="text-brand">{fmt(order.total)}</span></div>
            </div>
          </Card>
          {payments.length > 0 && (
            <Card>
              <h2 className="mb-3 font-bold">Payments</h2>
              {payments.map((p) => (
                <div key={p._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm last:border-0">
                  <span className="capitalize">{p.method} · {dt(p.paidAt)}</span>
                  <span className="font-semibold">{fmt(p.amount)} {p.status === "refunded" && <span className="text-brick">(refunded: {p.refundReason})</span>}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="space-y-1.5 text-sm">
            <h2 className="mb-2 font-bold">Details</h2>
            <p><span className="text-muted">Type:</span> {order.orderType.replace("_", " ")}</p>
            {order.tableNumber && <p><span className="text-muted">Table:</span> {order.tableNumber}</p>}
            {order.customerName && <p><span className="text-muted">Customer:</span> {order.customerName} {order.customerPhone}</p>}
            {order.deliveryAddress && <p><span className="text-muted">Address:</span> {order.deliveryAddress}</p>}
            {order.notes && <p><span className="text-muted">Notes:</span> {order.notes}</p>}
            <p><span className="text-muted">Cashier:</span> {fullName(order.createdBy) || "—"}</p>
            <p><span className="text-muted">Created:</span> {dt(order.createdAt)}</p>
            {order.origin === "offline_sync" && <p className="font-semibold text-brand">Created offline and synced</p>}
            {order.cancelReason && <p className="text-brick">Cancelled: {order.cancelReason}</p>}
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">Timeline</h2>
            <ol className="relative space-y-3 border-l border-line pl-4">
              {history.map((h) => (
                <li key={h._id} className="text-sm">
                  <span className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full ${STATUS_META[h.to].bar}`} />
                  <p className="font-semibold">{STATUS_META[h.to].label}</p>
                  <p className="text-xs text-muted">{dt(h.createdAt)} · {fullName(h.changedBy) || "system"}{h.note ? ` · ${h.note}` : ""}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <PaymentModal open={dialog === "pay"} onClose={close} total={order.total} loading={busy}
        onConfirm={(p) => run(() => dispatch(payOrderThunk({ id, ...p, operationId: uuid() })).unwrap(), "Payment recorded")} />

      <ConfirmDialog open={dialog === "cancel"} onClose={close} danger loading={busy} title="Cancel this order?" confirmLabel="Cancel order"
        message={order.paymentStatus === "paid" ? "The payment will be refunded automatically." : undefined}
        onConfirm={() => run(() => dispatch(cancelOrderThunk({ id, reason, restock })).unwrap(), "Order cancelled")}>
        <div className="mt-3 space-y-3">
          <Textarea label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {order.inventoryDeducted && (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="mt-1" />
              <span>Return ingredients to stock<br /><span className="text-xs text-muted">Leave off if the food was already prepared.</span></span></label>
          )}
        </div>
      </ConfirmDialog>

      <ConfirmDialog open={dialog === "refund"} onClose={close} danger loading={busy} title="Refund payment?" confirmLabel="Refund"
        message="The order stays completed. Stock is not returned."
        onConfirm={() => run(() => dispatch(refundOrderThunk({ id, reason })).unwrap(), "Payment refunded")}>
        <div className="mt-3"><Textarea label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      </ConfirmDialog>

      <ReceiptModal invoice={invoice} onClose={() => setInvoice(null)} />
    </>
  );
}
