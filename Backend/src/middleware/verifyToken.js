import httpStatusText from "../utils/httpStatusText.js";
import AppError from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import { TokenBlacklist } from "../models/modelBlackList.js";

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return next(
      AppError.create("Authentication required", 401, httpStatusText.ERROR),
    );
  }
  const tokenBlackList = await TokenBlacklist.findOne({ token });
  if (tokenBlackList) {
    return next(
      AppError.create(
        "token has been revoked, please login again",
        401,
        httpStatusText.ERROR,
      ),
    );
  }

  try {
    const currentUser = await jwt.verify(token, process.env.SECRET_KEY);

    req.currentUser = currentUser;
    req.token = token;
    next();
  } catch {
    const error = AppError.create("invalid token", 401, httpStatusText.ERROR);
    next(error);
  }
};

export default verifyToken;
