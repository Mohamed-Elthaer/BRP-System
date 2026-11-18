import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerSuppliers.js";

const router = express.Router();
router.use(verifyToken);

router
  .route("/")
  .get(requirePermission(P.INVENTORY_VIEW), controller.getSuppliers)
  .post(requirePermission(P.INVENTORY_MANAGE), controller.createSupplier);

router
  .route("/:id")
  .get(requirePermission(P.INVENTORY_VIEW), controller.getSupplier)
  .patch(requirePermission(P.INVENTORY_MANAGE), controller.updateSupplier)
  .delete(requirePermission(P.INVENTORY_MANAGE), controller.deactivateSupplier);

export default router;
