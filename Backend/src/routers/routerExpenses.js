import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerExpenses.js";
import receiptUpload, { uploadReceipts } from "../middleware/uploadReceipt.js";

const router = express.Router();
router.use(verifyToken, requirePermission(P.EXPENSES_MANAGE));

const receipts = [receiptUpload.array("receipts", 5), uploadReceipts];

router.route("/")
  .post(...receipts, controller.createExpense)
  .get(controller.getExpenses);

router.get("/summary", controller.getSummary); 

router.route("/:id")
  .get(controller.getExpense)
  .patch(...receipts, controller.updateExpense)
  .delete(controller.deleteExpense);

router.delete("/:id/receipts", controller.removeReceipt);

export default router;