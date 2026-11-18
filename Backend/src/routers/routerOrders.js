import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerOrders.js";

const router = express.Router();
router.use(verifyToken);

router
  .route("/")
  .post(requirePermission(P.POS_USE), controller.createOrder) 
  .get(requirePermission(P.ORDERS_VIEW), controller.getOrders);

router.get("/:id", requirePermission(P.ORDERS_VIEW), controller.getOrderById);
router.patch(
  "/:id/status",
  requirePermission(P.ORDERS_UPDATE_STATUS),
  controller.updateStatus,
);
router.post(
  "/:id/cancel",
  requirePermission(P.ORDERS_CANCEL),
  controller.cancel,
);

export default router;
