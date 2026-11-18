import { Printer } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { dt, money } from "../../Utils/format.js";

// الفاتورة نسخة ثابتة من وقت الدفع (الباك بيحفظ الأسعار والضرايب زي ما كانت)
export default function Receipt({ invoice }) {
  const m = (n) => money(n, invoice.currency);
  return (
    <div id="receipt-print" className="mx-auto w-full max-w-[320px] rounded-xl border border-dashed border-line bg-white p-5 font-mono text-[13px] text-[#2A2622] shadow-sm">
      <div className="text-center">
        <p className="text-base font-extrabold">{invoice.restaurant?.name}</p>
        {invoice.restaurant?.address && <p>{invoice.restaurant.address}</p>}
        {invoice.restaurant?.phone && <p>{invoice.restaurant.phone}</p>}
        {invoice.restaurant?.taxNumber && <p>Tax no. {invoice.restaurant.taxNumber}</p>}
      </div>
      <div className="my-3 border-y border-dashed border-[#bbb] py-2">
        <p>Invoice: {invoice.invoiceNumber}</p>
        <p>Order: #{invoice.orderNumber} ({invoice.orderType?.replace("_", " ")})</p>
        <p>{dt(invoice.createdAt)}</p>
        {invoice.status === "refunded" && <p className="font-bold text-[#B5412F]">REFUNDED</p>}
      </div>
      {invoice.lines.map((l, i) => (
        <div key={i} className="flex justify-between gap-2">
          <span>{l.quantity} × {l.name}</span><span>{m(l.total)}</span>
        </div>
      ))}
      <div className="mt-3 space-y-0.5 border-t border-dashed border-[#bbb] pt-2">
        <div className="flex justify-between"><span>Subtotal</span><span>{m(invoice.subtotal)}</span></div>
        {invoice.discount?.amount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{m(invoice.discount.amount)}</span></div>}
        {invoice.serviceCharge?.amount > 0 && <div className="flex justify-between"><span>Service {invoice.serviceCharge.rate}%</span><span>{m(invoice.serviceCharge.amount)}</span></div>}
        {invoice.tax?.amount > 0 && <div className="flex justify-between"><span>Tax {invoice.tax.rate}%</span><span>{m(invoice.tax.amount)}</span></div>}
        <div className="flex justify-between border-t border-[#bbb] pt-1 text-base font-extrabold"><span>Total</span><span>{m(invoice.total)}</span></div>
        <div className="flex justify-between"><span>Paid by</span><span className="capitalize">{invoice.paymentMethod}</span></div>
      </div>
      {invoice.footerNote && <p className="mt-3 text-center">{invoice.footerNote}</p>}
    </div>
  );
}

export function ReceiptModal({ invoice, onClose }) {
  return (
    <Modal open={!!invoice} onClose={onClose} title="Invoice" size="sm" footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button icon={Printer} onClick={() => window.print()}>Print</Button></>}>
      {invoice && <Receipt invoice={invoice} />}
    </Modal>
  );
}
