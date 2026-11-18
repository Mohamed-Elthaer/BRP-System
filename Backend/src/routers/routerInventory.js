import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerInventory.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", requirePermission(P.INVENTORY_VIEW), controller.getInventory);
router.get(
  "/transactions",
  requirePermission(P.INVENTORY_VIEW),
  controller.getTransactions,
);

router.post(
  "/purchases",
  requirePermission(P.INVENTORY_MANAGE),
  controller.addPurchase,
);
router.post(
  "/waste",
  requirePermission(P.INVENTORY_MANAGE),
  controller.recordWaste,
);
router.post(
  "/stocktake",
  requirePermission(P.INVENTORY_MANAGE),
  controller.stocktake,
);

export default router;
