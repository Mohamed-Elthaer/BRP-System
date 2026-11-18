import mongoose from "mongoose";
import { fail } from "./fail.js";

export const getPagination = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit) || defaultLimit, 1),
    maxLimit,
  );
  return { page, limit, skip: (page - 1) * limit };
};

export const pageMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

export const escapeRegex = (s) =>
  String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const assertId = (id, label = "id") => {
  if (!mongoose.isValidObjectId(id)) throw fail(`Invalid ${label}`, 400);
};


export const parseDateRange = (query, defaultDays = 30) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - defaultDays * 86400000);
  if (isNaN(from) || isNaN(to)) throw fail("Invalid date range", 400);
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
    to.setUTCHours(23, 59, 59, 999);
  }
  return { from, to };
};

export const pick = (obj, fields) =>
  fields.reduce((acc, f) => {
    if (obj[f] !== undefined) acc[f] = obj[f];
    return acc;
  }, {});