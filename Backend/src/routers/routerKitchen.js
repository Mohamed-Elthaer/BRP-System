import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerKitchen.js";

const router = express.Router();
router.use(verifyToken);

router.get(
  "/orders",
  requirePermission(P.KITCHEN_VIEW),
  controller.getKitchenOrders,
);
router.patch(
  "/orders/:id/status",
  requirePermission(P.KITCHEN_UPDATE),
  controller.updateKitchenStatus,
);

export default router;
