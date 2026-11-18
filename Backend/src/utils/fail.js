
import AppError from "./AppError.js";
import httpStatusText from "./httpStatusText.js";

export const fail = (message, code = 400) =>
  AppError.create(message, code, httpStatusText.ERROR);

export default fail;