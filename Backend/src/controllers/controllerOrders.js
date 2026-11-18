import asyncWrapper from "../middleware/asyncWrapper.js";
import Order from "../models/modelOrder.js";
import OrderStatusHistory from "../models/modelOrderStatusHistory.js";
import Payment from "../models/modelPayment.js";
import Invoice from "../models/modelInvoice.js";
import {
  placeOrder,
  updateOrderStatus,
  cancelOrder,
  ownOnly,
} from "../services/orderService.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import {
  assertId,
  pick,
  escapeRegex,
  getPagination,
  pageMeta,
  parseDateRange,
} from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const ORDER_FIELDS = [
  "orderType",
  "items",
  "discount",
  "tableNumber",
  "customerName",
  "customerPhone",
  "deliveryAddress",
  "notes",
  "clientOperationId",
  "payment",
];

const createOrder = asyncWrapper(async (req, res, next) => {
  const payload = pick(req.body, ORDER_FIELDS);
  if (
    payload.clientOperationId !== undefined &&
    (typeof payload.clientOperationId !== "string" ||
      payload.clientOperationId.length > 100)
  ) {
    return next(fail("Invalid clientOperationId", 400));
  }

  const { order, invoice, payment, duplicate } = await placeOrder(
    payload,
    req.currentUser,
  );

  if (!duplicate) {
    await logActivity({
      req,
      action: ACTIONS.ORDER_CREATE,
      entity: "Order",
      entityId: order._id,
      details: {
        orderNumber: order.orderNumber,
        total: order.total,
        type: order.orderType,
      },
    });
    if (payment) {
      await logActivity({
        req,
        action: ACTIONS.PAYMENT_CREATE,
        entity: "Order",
        entityId: order._id,
        details: { amount: payment.amount, method: payment.method },
      });
    }
  }
  send(res, { order, invoice, duplicate }, duplicate ? 200 : 201);
});

const getOrders = asyncWrapper(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, orderType, paymentStatus, origin, createdBy, search } =
    req.query;
  const filter = { ...ownOnly(req.currentUser) };

  if (status) filter.status = { $in: String(status).split(",") };
  if (orderType) filter.orderType = orderType;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (origin) filter.origin = origin;
  if (createdBy) {
    assertId(createdBy, "user id");
    if (!filter.createdBy) filter.createdBy = createdBy;
  }
  if (req.query.from || req.query.to) {
    const { from, to } = parseDateRange(req.query);
    filter.createdAt = { $gte: from, $lte: to };
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { orderNumber: rx },
      { customerName: rx },
      { customerPhone: rx },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  send(res, { orders, ...pageMeta(page, limit, total) });
});

const getOrderById = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id, "order id");
  const order = await Order.findOne({
    _id: req.params.id,
    ...ownOnly(req.currentUser),
  }).populate("createdBy", "firstName lastName");
  if (!order) return next(fail("Order not found", 404));

  const [history, payments, invoice] = await Promise.all([
    OrderStatusHistory.find({ order: order._id })
      .populate("changedBy", "firstName lastName")
      .sort({ createdAt: 1 }),
    Payment.find({ order: order._id }).sort({ createdAt: 1 }),
    Invoice.findOne({ order: order._id }),
  ]);
  send(res, { order, history, payments, invoice });
});

const updateStatus = asyncWrapper(async (req, res, next) => {
  const { status, note } = req.body;
  if (!status) return next(fail("status is required", 400));

  const order = await updateOrderStatus(
    req.params.id,
    status,
    req.currentUser,
    { note },
  );
  await logActivity({
    req,
    action: ACTIONS.ORDER_STATUS,
    entity: "Order",
    entityId: order._id,
    details: { orderNumber: order.orderNumber, status: order.status },
  });
  send(res, order);
});

const cancel = asyncWrapper(async (req, res) => {
  const { order, refunded } = await cancelOrder(
    req.params.id,
    req.currentUser,
    {
      reason: req.body.reason,
      restock: req.body.restock === true,
    },
  );
  await logActivity({
    req,
    action: ACTIONS.ORDER_CANCEL,
    entity: "Order",
    entityId: order._id,
    details: {
      orderNumber: order.orderNumber,
      reason: order.cancelReason,
      refunded,
      restock: req.body.restock === true,
    },
  });
  send(res, { order, refunded });
});

export default { createOrder, getOrders, getOrderById, updateStatus, cancel };
