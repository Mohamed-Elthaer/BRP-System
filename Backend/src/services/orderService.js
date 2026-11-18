import Order from "../models/modelOrder.js";
import OrderStatusHistory from "../models/modelOrderStatusHistory.js";
import MenuItem from "../models/modelMenuItem.js";
import Payment from "../models/modelPayment.js";
import Invoice from "../models/modelInvoice.js";
import Counter from "../models/modelCounter.js";
import { getSettings } from "./settingsService.js";
import {
  deductForOrder,
  restockForOrder,
  notifyLowStock,
} from "./inventoryService.js";
import { runInTransaction } from "../utils/withTransaction.js";
import { round2 } from "../utils/money.js";
import { fail } from "../utils/fail.js";
import { assertId } from "../utils/queryHelpers.js";
import { emit } from "../utils/socket.js";
import userRole from "../utils/userRoles.js";

export const STATUS = Object.freeze({
  NEW: "new",
  PREPARING: "preparing",
  READY: "ready",
  SERVED: "served",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});
export const PAY = Object.freeze({
  UNPAID: "unpaid",
  PAID: "paid",
  REFUNDED: "refunded",
});

export const TRANSITIONS = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "completed", "cancelled"],
  served: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const broadcastOrder = (order, event = "order:updated") =>
  emit(["kitchen", "orders", "dashboard"], event, order.toJSON());

export const ownOnly = (user) =>
  user.role === userRole.CASHIER ? { createdBy: user.id } : {};

const nextSequence = async (key, session) =>
  (
    await Counter.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session },
    )
  ).seq;

const generateOrderNumber = async (settings, session) => {
  const day = new Date()
    .toLocaleDateString("en-CA", { timeZone: settings.timezone })
    .replaceAll("-", "")
    .slice(2);
  const seq = await nextSequence(`order-${day}`, session);
  return `${day}-${String(seq).padStart(3, "0")}`;
};

export const calcTotals = ({
  lines,
  orderType,
  discount,
  settings,
  actorRole,
}) => {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));

  let applied = null;
  const explicit = discount && Number(discount.value) > 0;
  if (explicit)
    applied = { kind: discount.type, value: Number(discount.value) };
  else if (
    settings.defaultDiscount.enabled &&
    settings.defaultDiscount.value > 0
  ) {
    applied = {
      kind: settings.defaultDiscount.mode,
      value: settings.defaultDiscount.value,
    };
  }

  let discountAmount = 0;
  if (applied) {
    if (!["percent", "fixed"].includes(applied.kind))
      throw fail("Invalid discount type", 400);
    if (applied.kind === "percent" && applied.value > 100)
      throw fail("Discount cannot exceed 100%", 400);
    discountAmount = round2(
      applied.kind === "percent"
        ? (subtotal * applied.value) / 100
        : applied.value,
    );
    if (discountAmount > subtotal)
      throw fail("Discount cannot exceed the subtotal", 400);

    const canExceed = [userRole.OWNER, userRole.MANAGER].includes(actorRole);
    const percent = subtotal ? (discountAmount / subtotal) * 100 : 0;
    if (
      explicit &&
      !canExceed &&
      percent > settings.maxCashierDiscountPercent
    ) {
      throw fail(
        `Discounts above ${settings.maxCashierDiscountPercent}% require a manager`,
        403,
      );
    }
  }

  const afterDiscount = subtotal - discountAmount;
  const sc = settings.serviceCharge;
  const scRate = sc.enabled && sc.appliesTo.includes(orderType) ? sc.rate : 0;
  const scAmount = round2((afterDiscount * scRate) / 100);

  const taxRate = settings.tax.enabled ? settings.tax.rate : 0;
  const taxAmount = round2(((afterDiscount + scAmount) * taxRate) / 100);

  return {
    subtotal,
    discount: applied
      ? { kind: applied.kind, value: applied.value, amount: discountAmount }
      : { amount: 0 },
    serviceCharge: { rate: scRate, amount: scAmount },
    tax: { rate: taxRate, amount: taxAmount },
    total: round2(afterDiscount + scAmount + taxAmount),
  };
};

export const transitionOrder = async (
  order,
  to,
  user,
  { note, session } = {},
) => {
  const from = order.status;
  if (!TRANSITIONS[from]?.includes(to))
    throw fail(`Invalid status change: ${from} → ${to}`, 400);
  if (to === STATUS.COMPLETED && order.paymentStatus !== PAY.PAID) {
    throw fail("Order must be paid before it can be completed", 400);
  }

  if (to === STATUS.PREPARING) {
    const touched = await deductForOrder(order, user, session);
    order.$locals.touchedIngredients = touched;
  }

  order.status = to;
  order.set(`${to}At`, new Date());
  await order.save({ session });
  await OrderStatusHistory.create(
    [{ order: order._id, from, to, changedBy: user.id, note }],
    { session },
  );
  return order;
};

export const maybeComplete = async (order, user, { session } = {}) => {
  if (
    order.paymentStatus === PAY.PAID &&
    [STATUS.READY, STATUS.SERVED].includes(order.status)
  ) {
    await transitionOrder(order, STATUS.COMPLETED, user, {
      note: "Auto-completed after payment",
      session,
    });
  }
  return order;
};

export const updateOrderStatus = async (
  orderId,
  to,
  user,
  { note, allowed } = {},
) => {
  assertId(orderId, "order id");
  if (allowed && !allowed.includes(to))
    throw fail("You cannot set this status", 403);
  if (to === STATUS.CANCELLED)
    throw fail("Use the cancel endpoint to cancel an order", 400);

  const order = await runInTransaction(async (session) => {
    const o = await Order.findById(orderId).session(session);
    if (!o) throw fail("Order not found", 404);
    await transitionOrder(o, to, user, { note, session });
    await maybeComplete(o, user, { session });
    return o;
  });

  broadcastOrder(order);
  notifyLowStock(order.$locals.touchedIngredients).catch(() => {});
  return order;
};


const createInvoice = async (order, payment, settings, user, session) => {
  const seq = await nextSequence("invoice", session);
  const [invoice] = await Invoice.create(
    [
      {
        invoiceNumber: `${settings.invoice.prefix}-${String(seq).padStart(6, "0")}`,
        order: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        lines: order.items.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          total: round2(i.price * i.quantity),
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        serviceCharge: order.serviceCharge,
        tax: order.tax,
        total: order.total,
        payment: payment._id,
        paymentMethod: payment.method,
        currency: settings.currency,
        restaurant: {
          name: settings.restaurant.name,
          phone: settings.restaurant.phone,
          address: settings.restaurant.address,
          taxNumber: settings.invoice.showTaxNumber
            ? settings.restaurant.taxNumber
            : undefined,
        },
        footerNote: settings.invoice.footerNote,
        issuedBy: user.id,
      },
    ],
    { session },
  );
  return invoice;
};

export const payOrder = async (
  order,
  { method, amountTendered, operationId },
  user,
  settings,
  session,
) => {
  if (order.status === STATUS.CANCELLED)
    throw fail("Cannot pay a cancelled order", 400);
  if (order.paymentStatus === PAY.PAID)
    throw fail("Order is already paid", 409);
  if (order.paymentStatus === PAY.REFUNDED)
    throw fail("Order was refunded", 409);

  if (!settings.paymentMethods.some((p) => p.key === method && p.enabled)) {
    throw fail("Payment method is not available", 400);
  }

  let change = 0;
  if (method === "cash" && amountTendered != null) {
    if (Number(amountTendered) < order.total)
      throw fail("Amount tendered is less than the total", 400);
    change = round2(Number(amountTendered) - order.total);
  }

  const [payment] = await Payment.create(
    [
      {
        order: order._id,
        amount: order.total,
        method,
        amountTendered: method === "cash" ? amountTendered : undefined,
        change,
        operationId,
        receivedBy: user.id,
      },
    ],
    { session },
  );

  order.paymentStatus = PAY.PAID;
  order.paymentMethod = method;
  order.paidAt = payment.paidAt;
  await order.save({ session });

  const invoice = await createInvoice(order, payment, settings, user, session);
  await maybeComplete(order, user, { session });
  return { order, payment, invoice };
};

export const refundOrder = async (order, user, reason, session) => {
  if (order.paymentStatus !== PAY.PAID)
    throw fail("Only paid orders can be refunded", 400);
  if (!reason) throw fail("Refund reason is required", 400);

  const payments = await Payment.find({
    order: order._id,
    status: "completed",
  }).session(session);
  for (const p of payments) {
    p.status = "refunded";
    p.refundedAt = new Date();
    p.refundedBy = user.id;
    p.refundReason = reason;
    await p.save({ session });
  }
  order.paymentStatus = PAY.REFUNDED;
  order.refundedAt = new Date();
  await order.save({ session });
  await Invoice.updateOne(
    { order: order._id },
    { status: "refunded" },
    { session },
  );
  return payments.reduce((s, p) => s + p.amount, 0);
};


export const cancelOrder = async (
  orderId,
  user,
  { reason, restock = false },
) => {
  assertId(orderId, "order id");
  if (!reason || !String(reason).trim())
    throw fail("Cancellation reason is required", 400);

  const result = await runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw fail("Order not found", 404);
    if (order.status === STATUS.COMPLETED)
      throw fail(
        "Completed orders cannot be cancelled. Use refund instead",
        400,
      );

    let refunded = 0;
    if (order.paymentStatus === PAY.PAID)
      refunded = await refundOrder(order, user, reason, session);
    if (restock === true) await restockForOrder(order, user, session);

    order.cancelReason = reason;
    await transitionOrder(order, STATUS.CANCELLED, user, {
      note: reason,
      session,
    });
    return { order, refunded };
  });

  broadcastOrder(result.order);
  return result;
};

const createOrderCore = async (payload, user, settings, session) => {
  const {
    orderType,
    items,
    discount,
    clientOperationId,
    origin = "online",
  } = payload;

  if (clientOperationId) {
    const existing = await Order.findOne({ clientOperationId }).session(
      session,
    );
    if (existing) return { order: existing, duplicate: true };
  }

  const typeCfg = settings.orderTypes.find(
    (t) => t.key === orderType && t.enabled,
  );
  if (!typeCfg) throw fail("Order type is not available", 400);
  const missing = typeCfg.requiredFields.filter(
    (f) => !String(payload[f] ?? "").trim(),
  );
  if (missing.length)
    throw fail(`Missing required fields: ${missing.join(", ")}`, 400);

  if (!Array.isArray(items) || !items.length)
    throw fail("Order must contain at least one item", 400);
  for (const i of items) {
    if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 100) {
      throw fail("Item quantity must be a whole number between 1 and 100", 400);
    }
  }

  const menu = await MenuItem.find({
    _id: { $in: items.map((i) => i.menuItem) },
  }).session(session);
  const byId = new Map(menu.map((m) => [String(m._id), m]));
  const lines = items.map((i) => {
    const m = byId.get(String(i.menuItem));
    if (!m) throw fail("Menu item not found", 404);
    if (m.isArchived || !m.isAvailable)
      throw fail(`"${m.name}" is not available right now`, 409);
    return {
      menuItem: m._id,
      name: m.name,
      price: m.price,
      cost: m.cost,
      quantity: i.quantity,
      notes: i.notes,
    };
  });

  const totals = calcTotals({
    lines,
    orderType,
    discount,
    settings,
    actorRole: user.role,
  });

  const [order] = await Order.create(
    [
      {
        orderNumber: await generateOrderNumber(settings, session),
        orderType,
        items: lines,
        tableNumber: payload.tableNumber,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        deliveryAddress: payload.deliveryAddress,
        notes: payload.notes,
        ...totals,
        clientOperationId,
        origin,
        createdBy: user.id,
      },
    ],
    { session },
  );
  await OrderStatusHistory.create(
    [{ order: order._id, from: null, to: STATUS.NEW, changedBy: user.id }],
    { session },
  );
  return { order, duplicate: false };
};

export const placeOrder = async (payload, user) => {
  const settings = await getSettings();

  const result = await runInTransaction(async (session) => {
    const created = await createOrderCore(payload, user, settings, session);
    if (created.duplicate) return created;

    if (payload.payment?.method) {
      const operationId = payload.clientOperationId
        ? `${payload.clientOperationId}:payment`
        : undefined;
      const paid = await payOrder(
        created.order,
        { ...payload.payment, operationId },
        user,
        settings,
        session,
      );
      return { ...created, invoice: paid.invoice, payment: paid.payment };
    }
    return created;
  });

  if (!result.duplicate) broadcastOrder(result.order, "order:created");
  return result;
};

export const payExistingOrder = async (orderId, body, user) => {
  assertId(orderId, "order id");
  const settings = await getSettings();

  if (body.operationId) {
    const prev = await Payment.findOne({ operationId: body.operationId });
    if (prev) {
      const [order, invoice] = await Promise.all([
        Order.findById(prev.order),
        Invoice.findOne({ order: prev.order }),
      ]);
      return { order, payment: prev, invoice, duplicate: true };
    }
  }

  const result = await runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw fail("Order not found", 404);
    return payOrder(order, body, user, settings, session);
  });

  broadcastOrder(result.order);
  return { ...result, duplicate: false };
};
