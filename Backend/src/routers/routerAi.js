import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS as P } from "../utils/userRoles.js";
import controller from "../controllers/controllerAi.js";

const router = express.Router();
router.use(verifyToken, requirePermission(P.AI_USE));

router.get("/briefing", controller.getBriefing);
router.post("/chat", controller.chat);
router.post("/chat/stream", controller.chatStream);

export default router;
