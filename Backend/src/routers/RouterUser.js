import rateLimit from "express-rate-limit";
import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import allowedToken from "../middleware/allowedToken.js";
import userRole from "../utils/userRoles.js";

import upload, { uploadImage } from "../middleware/uploadCloudinary.js";
import controllerUsers from "../controllers/controllerUsers.js";

const router = express.Router();

const loginLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    status: "error",
    message: "too many login attempts, try again later",
  },
});

const staffManagers = allowedToken(userRole.OWNER, userRole.MANAGER);

router.post("/register", controllerUsers.register);
router.post("/login", loginLimit, controllerUsers.login);
router.post("/logout", verifyToken, controllerUsers.logout);

router
  .route("/me")
  .get(verifyToken, controllerUsers.getMe)
  .patch(
    verifyToken,
    upload.single("avatar"),
    uploadImage,
    controllerUsers.updateMe,
  );
router.patch("/me/password", verifyToken, controllerUsers.changeMyPassword);

router
  .route("/")
  .post(
    verifyToken,
    staffManagers,
    upload.single("avatar"),
    uploadImage,
    controllerUsers.createUser,
  )
  .get(verifyToken, staffManagers, controllerUsers.getAllUsers);

router
  .route("/:id")
  .get(verifyToken, staffManagers, controllerUsers.getUserById)
  .patch(
    verifyToken,
    staffManagers,
    upload.single("avatar"),
    uploadImage,
    controllerUsers.updateUser,
  );

router.patch(
  "/:id/status",
  verifyToken,
  staffManagers,
  controllerUsers.setUserStatus,
);
router.patch(
  "/:id/password",
  verifyToken,
  staffManagers,
  controllerUsers.resetUserPassword,
);

export default router;
