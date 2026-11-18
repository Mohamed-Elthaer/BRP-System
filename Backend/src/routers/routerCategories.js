import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerCategories.js";

const router = express.Router();
router.use(verifyToken);

router.route("/")
  .get(controller.getCategories) 
  .post(requirePermission(P.MENU_MANAGE), controller.createCategory);

router.route("/:id")
  .patch(requirePermission(P.MENU_MANAGE), controller.updateCategory)
  .delete(requirePermission(P.MENU_MANAGE), controller.deleteCategory);

export default router;
