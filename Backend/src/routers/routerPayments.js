import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerPayments.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", requirePermission(P.ORDERS_VIEW), controller.getPayments);
router.post("/orders/:orderId", requirePermission(P.POS_USE), controller.pay);
router.post(
  "/orders/:orderId/refund",
  requirePermission(P.ORDERS_CANCEL),
  controller.refund,
);

export default router;
