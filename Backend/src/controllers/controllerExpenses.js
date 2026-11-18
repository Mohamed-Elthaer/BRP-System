import mongoose from "mongoose";
import asyncWrapper from "../middleware/asyncWrapper.js";
import Expense from "../models/modelExpense.js";
import { getSettings } from "../services/settingsService.js";
import { destroyFiles } from "../middleware/uploadReceipt.js";
import { round2 } from "../utils/money.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import {
  assertId,
  pick,
  escapeRegex,
  getPagination,
  pageMeta,
  parseDateRange,
} from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const FIELDS = ["amount", "category", "description", "date"];

const reject = async (req, next, message, code) => {
  await destroyFiles(req.uploadedFiles);
  return next(fail(message, code));
};

const buildFilter = (query) => {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.createdBy) {
    assertId(query.createdBy, "user id");
    filter.createdBy = query.createdBy;
  }
  if (query.search)
    filter.description = new RegExp(escapeRegex(query.search), "i");
  if (query.from || query.to) {
    const { from, to } = parseDateRange(query);
    filter.date = { $gte: from, $lte: to };
  }
  return filter;
};

const createExpense = asyncWrapper(async (req, res, next) => {
  const data = pick(req.body, FIELDS);
  const settings = await getSettings();
  if (!settings.expenseCategories.includes(data.category)) {
    return reject(
      req,
      next,
      `Invalid category. Allowed: ${settings.expenseCategories.join(", ")}`,
      400,
    );
  }

  let expense;
  try {
    expense = await Expense.create({
      ...data,
      receipts: req.uploadedFiles || [],
      createdBy: req.currentUser.id,
    });
  } catch (err) {
    await destroyFiles(req.uploadedFiles);
    throw err;
  }
  await logActivity({
    req,
    action: ACTIONS.EXPENSE_CREATE,
    entity: "Expense",
    entityId: expense._id,
    details: { amount: expense.amount, category: expense.category },
  });
  send(res, expense, 201);
});

const getExpenses = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);

  
  const matchForAgg = { ...filter };
  if (filter.createdBy)
    matchForAgg.createdBy = new mongoose.Types.ObjectId(filter.createdBy);

  const [expenses, total, totals] = await Promise.all([
    Expense.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: matchForAgg },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
  ]);
  send(res, {
    expenses,
    totalAmount: round2(totals[0]?.amount || 0),
    ...pageMeta(page, limit, total),
  });
});

const getExpense = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const expense = await Expense.findById(req.params.id).populate(
    "createdBy",
    "firstName lastName",
  );
  if (!expense) return next(fail("Expense not found", 404));
  send(res, expense);
});

const getSummary = asyncWrapper(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const { timezone } = await getSettings();
  const match = { date: { $gte: from, $lte: to } };

  const [byCategory, byDay] = await Promise.all([
    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date", timezone },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const total = round2(byCategory.reduce((s, c) => s + c.total, 0));
  send(res, {
    period: { from, to },
    total,
    byCategory: byCategory.map((c) => ({
      category: c._id,
      total: round2(c.total),
      count: c.count,
      percent: total ? round2((c.total / total) * 100) : 0,
    })),
    byDay: byDay.map((d) => ({ date: d._id, total: round2(d.total) })),
  });
});

const updateExpense = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const expense = await Expense.findById(req.params.id);
  if (!expense) return reject(req, next, "Expense not found", 404);

  const data = pick(req.body, FIELDS);
  if (data.category) {
    const settings = await getSettings();
    if (!settings.expenseCategories.includes(data.category))
      return reject(req, next, "Invalid category", 400);
  }

  const before = {
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
  };
  Object.assign(expense, data);
  if (req.uploadedFiles?.length) expense.receipts.push(...req.uploadedFiles);

  try {
    await expense.save();
  } catch (err) {
    await destroyFiles(req.uploadedFiles);
    throw err;
  }
  await logActivity({
    req,
    action: ACTIONS.EXPENSE_UPDATE,
    entity: "Expense",
    entityId: expense._id,
    details: {
      before,
      changes: data,
      addedReceipts: req.uploadedFiles?.length || 0,
    },
  });
  send(res, expense);
});

const removeReceipt = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const { publicId } = req.query;
  const expense = await Expense.findById(req.params.id);
  if (!expense) return next(fail("Expense not found", 404));

  const file = expense.receipts.find((r) => r.public_id === publicId);
  if (!file) return next(fail("Receipt not found", 404));

  expense.receipts = expense.receipts.filter((r) => r.public_id !== publicId);
  await expense.save();
  await destroyFiles([file]);
  await logActivity({
    req,
    action: ACTIONS.EXPENSE_UPDATE,
    entity: "Expense",
    entityId: expense._id,
    details: { removedReceipt: publicId },
  });
  send(res, expense);
});

const deleteExpense = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return next(fail("Expense not found", 404));
  await destroyFiles(expense.receipts);
  await logActivity({
    req,
    action: ACTIONS.EXPENSE_DELETE,
    entity: "Expense",
    entityId: expense._id,
    details: expense.toJSON(),
  });
  send(res);
});

export default {
  createExpense,
  getExpenses,
  getExpense,
  getSummary,
  updateExpense,
  removeReceipt,
  deleteExpense,
};
