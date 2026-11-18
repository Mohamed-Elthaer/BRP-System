import { hasPermission } from "../utils/userRoles.js";
import { fail } from "../utils/fail.js";


const requirePermission =
  (...permissions) =>
  (req, _res, next) => {
    const role = req.currentUser?.role;
    if (!permissions.some((p) => hasPermission(role, p))) {
      return next(fail("You do not have permission to perform this action", 403));
    }
    next();
  };

export default requirePermission;