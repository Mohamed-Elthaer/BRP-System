import mongoose from "mongoose";
import asyncWrapper from "../middleware/asyncWrapper.js";
import SyncOperation, { SYNC_STATUSES } from "../models/modelSyncOperation.js";
import Order from "../models/modelOrder.js";
import User from "../models/ModelUser.js";
import { placeOrder, payExistingOrder } from "../services/orderService.js";
import userRole from "../utils/userRoles.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { pick, getPagination, pageMeta } from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const MAX_BATCH = 50;
const MAX_ATTEMPTS = 5;
const ORDER_FIELDS = [
  "orderType",
  "items",
  "discount",
  "tableNumber",
  "customerName",
  "customerPhone",
  "deliveryAddress",
  "notes",
  "payment",
];

const isManager = (user) =>
  [userRole.OWNER, userRole.MANAGER].includes(user.role);
const scopeFor = (user) => (isManager(user) ? {} : { user: user.id });

const runOperation = async (op, user) => {
  const p = op.payload || {};

  if (op.type === "create_order") {
    const { order, invoice, duplicate } = await placeOrder(
      {
        ...pick(p, ORDER_FIELDS),
        clientOperationId: op.operationId,
        origin: "offline_sync",
      },
      user,
    );
    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      invoiceId: invoice?._id,
      duplicate,
    };
  }

  if (op.type === "pay_order") {
    let orderId = p.orderId;
    if (!orderId && p.orderOperationId) {
      const o = await Order.findOne({
        clientOperationId: p.orderOperationId,
      }).select("_id");
      if (!o) throw fail("The related order has not been synced yet", 424);
      orderId = o._id;
    }
    if (!orderId) throw fail("orderId or orderOperationId is required", 400);

    const { order, payment, duplicate } = await payExistingOrder(
      orderId,
      {
        method: p.method,
        amountTendered: p.amountTendered,
        operationId: op.operationId,
      },
      user,
    );
    return { orderId: order._id, paymentId: payment._id, duplicate };
  }

  throw fail(`Unsupported operation type: ${op.type}`, 400);
};

const processAndSave = async (op, user) => {
  if (op.attempts >= MAX_ATTEMPTS) {
    return {
      operationId: op.operationId,
      status: op.status,
      error: "Maximum retry attempts reached. Contact a manager",
    };
  }
  op.attempts += 1;
  try {
    op.result = await runOperation(op, user);
    op.status = "done";
    op.error = undefined;
  } catch (err) {
    const code = err.statusCode ?? err.status;
    op.status = code === 409 ? "conflict" : "failed";
    op.error = code ? err.message : "Unexpected server error";
    if (!code) console.error("sync operation failed:", err);
  }
  op.processedAt = new Date();
  await op.save();
  return {
    operationId: op.operationId,
    status: op.status,
    result: op.result,
    error: op.error,
  };
};

const push = asyncWrapper(async (req, res, next) => {
  const { operations } = req.body;
  if (
    !Array.isArray(operations) ||
    !operations.length ||
    operations.length > MAX_BATCH
  ) {
    return next(
      fail(`operations must be an array of 1-${MAX_BATCH} items`, 400),
    );
  }

  const results = [];
  for (const item of operations) {
    const { operationId, type, payload, clientCreatedAt } = item || {};
    if (
      typeof operationId !== "string" ||
      !operationId ||
      operationId.length > 100 ||
      typeof type !== "string"
    ) {
      results.push({
        operationId,
        status: "failed",
        error: "operationId and type are required",
      });
      continue;
    }

    let op = await SyncOperation.findOne({ operationId });
    if (!op) {
      try {
        op = await SyncOperation.create({
          operationId,
          type,
          payload,
          clientCreatedAt,
          user: req.currentUser.id,
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        op = await SyncOperation.findOne({ operationId });
      }
    }

    if (String(op.user) !== String(req.currentUser.id)) {
      results.push({
        operationId,
        status: "failed",
        error: "Operation belongs to another user",
      });
      continue;
    }
    if (["done", "dismissed"].includes(op.status)) {
      results.push({
        operationId,
        status: op.status,
        result: op.result,
        duplicate: true,
      });
      continue;
    }
    results.push(await processAndSave(op, req.currentUser));
  }

  send(res, { results });
});

const getStatus = asyncWrapper(async (req, res) => {
  const scope = scopeFor(req.currentUser);
  const matchAgg = scope.user
    ? { user: new mongoose.Types.ObjectId(scope.user) }
    : {};

  const [grouped, attention] = await Promise.all([
    SyncOperation.aggregate([
      { $match: matchAgg },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    SyncOperation.find({ ...scope, status: { $in: ["failed", "conflict"] } })
      .select("operationId type status error attempts createdAt")
      .sort({ createdAt: -1 })
      .limit(50),
  ]);
  const counts = Object.fromEntries(SYNC_STATUSES.map((s) => [s, 0]));
  grouped.forEach((g) => (counts[g._id] = g.count));
  send(res, { counts, attention });
});

const getOperations = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...scopeFor(req.currentUser) };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [operations, total] = await Promise.all([
    SyncOperation.find(filter)
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SyncOperation.countDocuments(filter),
  ]);
  send(res, { operations, ...pageMeta(page, limit, total) });
});

const findScoped = async (req, next) => {
  const op = await SyncOperation.findOne({
    operationId: req.params.operationId,
    ...scopeFor(req.currentUser),
  });
  if (!op) next(fail("Operation not found", 404));
  return op;
};

const retry = asyncWrapper(async (req, res, next) => {
  const op = await findScoped(req, next);
  if (!op) return;
  if (!["failed", "conflict"].includes(op.status))
    return next(
      fail("Only failed or conflicting operations can be retried", 400),
    );

  const owner = await User.findById(op.user);
  const actor = owner
    ? { id: String(owner._id), role: owner.role }
    : req.currentUser;
  send(res, await processAndSave(op, actor));
});

const dismiss = asyncWrapper(async (req, res, next) => {
  const { note } = req.body;
  if (!note || !String(note).trim())
    return next(fail("A resolution note is required", 400));
  const op = await findScoped(req, next);
  if (!op) return;
  if (!["failed", "conflict"].includes(op.status))
    return next(
      fail("Only failed or conflicting operations can be dismissed", 400),
    );

  op.status = "dismissed";
  op.resolvedBy = req.currentUser.id;
  op.resolutionNote = note;
  await op.save();
  await logActivity({
    req,
    action: ACTIONS.SYNC_RESOLVE,
    entity: "SyncOperation",
    entityId: op.operationId,
    details: { type: op.type, note },
  });
  send(res, op);
});

export default { push, getStatus, getOperations, retry, dismiss };
