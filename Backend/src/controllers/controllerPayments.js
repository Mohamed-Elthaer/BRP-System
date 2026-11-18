import asyncWrapper from "../middleware/asyncWrapper.js";
import Order from "../models/modelOrder.js";
import Payment from "../models/modelPayment.js";
import userRole from "../utils/userRoles.js";
import {
  payExistingOrder,
  refundOrder,
  broadcastOrder,
} from "../services/orderService.js";
import { runInTransaction } from "../utils/withTransaction.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import {
  assertId,
  pick,
  getPagination,
  pageMeta,
  parseDateRange,
} from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const pay = asyncWrapper(async (req, res) => {
  const body = pick(req.body, ["method", "amountTendered", "operationId"]);
  const { order, payment, invoice, duplicate } = await payExistingOrder(
    req.params.orderId,
    body,
    req.currentUser,
  );

  if (!duplicate) {
    await logActivity({
      req,
      action: ACTIONS.PAYMENT_CREATE,
      entity: "Order",
      entityId: order._id,
      details: {
        orderNumber: order.orderNumber,
        amount: payment.amount,
        method: payment.method,
      },
    });
  }
  send(res, { order, payment, invoice, duplicate }, duplicate ? 200 : 201);
});

const refund = asyncWrapper(async (req, res, next) => {
  assertId(req.params.orderId, "order id");
  const { reason } = req.body;
  if (!reason || !String(reason).trim())
    return next(fail("Refund reason is required", 400));

  const result = await runInTransaction(async (session) => {
    const order = await Order.findById(req.params.orderId).session(session);
    if (!order) throw fail("Order not found", 404);
    const amount = await refundOrder(order, req.currentUser, reason, session);
    return { order, amount };
  });

  broadcastOrder(result.order);
  await logActivity({
    req,
    action: ACTIONS.PAYMENT_REFUND,
    entity: "Order",
    entityId: result.order._id,
    details: {
      orderNumber: result.order.orderNumber,
      amount: result.amount,
      reason,
    },
  });
  send(res, result);
});

const getPayments = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { method, status } = req.query;
  const filter = {};
  if (req.currentUser.role === userRole.CASHIER)
    filter.receivedBy = req.currentUser.id;
  if (method) filter.method = method;
  if (status) filter.status = status;
  if (req.query.from || req.query.to) {
    const { from, to } = parseDateRange(req.query);
    filter.paidAt = { $gte: from, $lte: to };
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("order", "orderNumber total")
      .populate("receivedBy", "firstName lastName")
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);
  send(res, { payments, ...pageMeta(page, limit, total) });
});

export default { pay, refund, getPayments };
