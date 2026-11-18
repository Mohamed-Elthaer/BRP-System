import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { Input } from "../ui/Fields.jsx";
import useMoney from "../../Hooks/useMoney.js";

const ICONS = { cash: Banknote, card: CreditCard, wallet: Smartphone };

// طرق الدفع من الإعدادات (settings.paymentMethods). الباك بيتحقق من المبلغ والطريقة
export default function PaymentModal({ open, onClose, total, onConfirm, loading }) {
  const fmt = useMoney();
  const methods = useSelector((s) => s.settings.data?.paymentMethods?.filter((m) => m.enabled)) || [{ key: "cash", label: "Cash" }];
  const [method, setMethod] = useState("");
  const [tendered, setTendered] = useState("");

  useEffect(() => {
    if (open) { setMethod(methods[0]?.key || "cash"); setTendered(""); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = Number(tendered) - total;
  const cashInvalid = method === "cash" && tendered !== "" && change < 0;
  const quick = [...new Set([total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 200) * 200])].filter((v) => v >= total).slice(0, 4);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pay & complete"
      size="sm"
      footer={
        <Button variant="saffron" size="lg" className="w-full" loading={loading} disabled={cashInvalid} onClick={() => onConfirm({ method, amountTendered: method === "cash" && tendered !== "" ? Number(tendered) : undefined })}>
          Confirm {fmt(total)}
        </Button>
      }
    >
      <p className="text-center text-3xl font-extrabold text-brand">{fmt(total)}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {methods.map((m) => {
          const Icon = ICONS[m.key] || CreditCard;
          const active = method === m.key;
          return (
            <button key={m.key} onClick={() => setMethod(m.key)} className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-semibold transition ${active ? "border-saffron bg-saffron-soft" : "border-line hover:bg-primary-soft"}`}>
              <Icon className="size-5" />{m.label || m.key}
            </button>
          );
        })}
      </div>
      {method === "cash" && (
        <div className="mt-4 space-y-3">
          <Input label="Amount received (optional)" type="number" min={0} step="any" value={tendered} onChange={(e) => setTendered(e.target.value)} error={cashInvalid ? "Less than the total" : undefined} />
          <div className="flex flex-wrap gap-2">{quick.map((v) => <button key={v} onClick={() => setTendered(String(v))} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-primary-soft">{fmt(v)}</button>)}</div>
          {tendered !== "" && change >= 0 && <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-brand">Change due: {fmt(change)}</p>}
        </div>
      )}
    </Modal>
  );
}
