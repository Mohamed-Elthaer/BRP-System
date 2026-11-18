import mongoose from "mongoose";

export default function dbGuard(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      status: "error",
      message: "Database unavailable. Please try again shortly.",
    });
  }

  next();
}