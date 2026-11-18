const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// معاينة فقط للـ POS. السيرفر هو اللي بيحسب الإجمالي النهائي (نفس معادلة الباك)
export const previewTotals = ({ items, orderType, discount, settings }) => {
  const subtotal = r2(items.reduce((s, i) => s + i.price * i.quantity, 0));

  let discountAmount = 0;
  const v = Number(discount?.value) || 0;
  if (v > 0) discountAmount = discount.type === "percent" ? r2((subtotal * v) / 100) : v;
  else if (settings?.defaultDiscount?.enabled && settings.defaultDiscount.value > 0) {
    const d = settings.defaultDiscount;
    discountAmount = d.mode === "percent" ? r2((subtotal * d.value) / 100) : d.value;
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const after = subtotal - discountAmount;
  const sc = settings?.serviceCharge;
  const scRate = sc?.enabled && sc.appliesTo?.includes(orderType) ? sc.rate : 0;
  const scAmount = r2((after * scRate) / 100);
  const taxRate = settings?.tax?.enabled ? settings.tax.rate : 0;
  const taxAmount = r2(((after + scAmount) * taxRate) / 100);

  return {
    subtotal,
    discount: discountAmount,
    service: { rate: scRate, amount: scAmount },
    tax: { rate: taxRate, amount: taxAmount },
    total: r2(after + scAmount + taxAmount),
  };
};
