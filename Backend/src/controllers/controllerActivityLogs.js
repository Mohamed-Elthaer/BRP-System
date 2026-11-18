import asyncWrapper from "../middleware/asyncWrapper.js";
import ActivityLog from "../models/modelActivityLog.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { assertId, escapeRegex, getPagination, pageMeta, parseDateRange } from "../utils/queryHelpers.js";

const getLogs = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 30);
  const { user, action, entity, entityId } = req.query;
  const filter = {};

  if (user) { assertId(user, "user id"); filter.user = user; }
  if (action) filter.action = new RegExp(`^${escapeRegex(action)}`); 
  if (entity) filter.entity = entity;
  if (entityId) filter.entityId = entityId;
  if (req.query.from || req.query.to) {
    const { from, to } = parseDateRange(req.query);
    filter.createdAt = { $gte: from, $lte: to };
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter).populate("user", "firstName lastName role").sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);
  send(res, { logs, ...pageMeta(page, limit, total) });
});

const getLog = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const log = await ActivityLog.findById(req.params.id).populate("user", "firstName lastName role");
  if (!log) return next(fail("Log not found", 404));
  send(res, log);
});

const getActionTypes = asyncWrapper(async (_req, res) => {
  send(res, (await ActivityLog.distinct("action")).sort());
});

export default { getLogs, getLog, getActionTypes };