import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerSettings.js";
import upload, { uploadImage } from "../middleware/uploadCloudinary.js";

const router = express.Router();
router.use(verifyToken);

router.route("/")
  .get(controller.getSettings) 
  .patch(requirePermission(P.SETTINGS_MANAGE), controller.updateSettings);

router.get("/roles", requirePermission(P.SETTINGS_MANAGE), controller.getRoles);
router.patch("/logo", requirePermission(P.SETTINGS_MANAGE), upload.single("logo"), uploadImage, controller.updateLogo);

export default router;