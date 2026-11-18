import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";

import controller from "../controllers/controllerActivityLogs.js";



const router = express.Router();
router.use(verifyToken, requirePermission(P.LOGS_VIEW));

router.get("/", controller.getLogs);
router.get("/actions", controller.getActionTypes); 
router.get("/:id", controller.getLog);

export default router;