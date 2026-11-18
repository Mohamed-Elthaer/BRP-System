import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerRecipes.js";

const router = express.Router();
router.use(verifyToken, requirePermission(P.MENU_MANAGE));

router.get("/", controller.getRecipes);

router
  .route("/:menuItemId")
  .get(controller.getRecipe)
  .put(controller.upsertRecipe)
  .delete(controller.deleteRecipe);

export default router;
