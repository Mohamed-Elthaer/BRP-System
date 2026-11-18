import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerInvoices.js";

const router = express.Router();
router.use(verifyToken, requirePermission(P.ORDERS_VIEW));

router.get("/", controller.getInvoices);
router.get("/order/:orderId", controller.getInvoiceByOrder); 
router.get("/:id", controller.getInvoice);

export default router;
