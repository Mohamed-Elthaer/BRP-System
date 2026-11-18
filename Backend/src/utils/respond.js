
import httpStatusText from "./httpStatusText.js";

export const send = (res, data = null, code = 200) =>
  res.status(code).json({ status: httpStatusText.SUCCESS, data });