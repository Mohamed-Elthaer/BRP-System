import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerIngredients.js";

const router = express.Router();
router.use(verifyToken);

router
  .route("/")
  .get(
    requirePermission(P.INVENTORY_VIEW, P.MENU_MANAGE),
    controller.getIngredients,
  )
  .post(requirePermission(P.INVENTORY_MANAGE), controller.createIngredient);

router
  .route("/:id")
  .get(
    requirePermission(P.INVENTORY_VIEW, P.MENU_MANAGE),
    controller.getIngredient,
  )
  .patch(requirePermission(P.INVENTORY_MANAGE), controller.updateIngredient)
  .delete(requirePermission(P.INVENTORY_MANAGE), controller.deleteIngredient);

export default router;
