import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerDashboard.js";

const router = express.Router();
router.use(verifyToken, requirePermission(P.DASHBOARD_VIEW));

router.get("/", controller.getDashboard);
router.get("/notifications", controller.getNotifications);

export default router;