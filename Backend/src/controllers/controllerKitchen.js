import asyncWrapper from "../middleware/asyncWrapper.js";
import Order from "../models/modelOrder.js";
import { updateOrderStatus } from "../services/orderService.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const KITCHEN_STATUSES = ["preparing", "ready"];

const getKitchenOrders = asyncWrapper(async (_req, res) => {
  const orders = await Order.find({
    status: { $in: ["new", "preparing", "ready"] },
  })
    .select(
      "orderNumber orderType status items.name items.quantity items.notes tableNumber notes createdAt preparingAt readyAt",
    )
    .sort({ createdAt: 1 });
  send(res, orders);
});

const updateKitchenStatus = asyncWrapper(async (req, res, next) => {
  const { status } = req.body;
  if (!KITCHEN_STATUSES.includes(status))
    return next(fail("Kitchen can only set: preparing or ready", 400));

  const order = await updateOrderStatus(
    req.params.id,
    status,
    req.currentUser,
    { allowed: KITCHEN_STATUSES },
  );
  await logActivity({
    req,
    action: ACTIONS.ORDER_STATUS,
    entity: "Order",
    entityId: order._id,
    details: {
      orderNumber: order.orderNumber,
      status: order.status,
      source: "kitchen",
    },
  });
  send(res, order);
});

export default { getKitchenOrders, updateKitchenStatus };
