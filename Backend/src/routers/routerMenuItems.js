import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerMenuItems.js";
import upload, { uploadImage } from "../middleware/uploadCloudinary.js";

const router = express.Router();
router.use(verifyToken);

router.route("/")
  .get(controller.getMenuItems) 
  .post(requirePermission(P.MENU_MANAGE), upload.single("image"), uploadImage, controller.createMenuItem);


router.patch("/:id/availability", requirePermission(P.MENU_MANAGE, P.KITCHEN_UPDATE), controller.setAvailability);

router.route("/:id")
  .get(controller.getMenuItem)
  .patch(requirePermission(P.MENU_MANAGE), upload.single("image"), uploadImage, controller.updateMenuItem)
  .delete(requirePermission(P.MENU_MANAGE), controller.deleteMenuItem);

export default router;