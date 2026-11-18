import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerSync.js";

const router = express.Router();
router.use(verifyToken);


router.post("/push", requirePermission(P.POS_USE), controller.push);
router.get("/status", requirePermission(P.POS_USE), controller.getStatus);
router.get("/operations", requirePermission(P.POS_USE), controller.getOperations);
router.post("/operations/:operationId/retry", requirePermission(P.POS_USE), controller.retry);
router.post("/operations/:operationId/dismiss", requirePermission(P.ORDERS_CANCEL), controller.dismiss);

export default router;