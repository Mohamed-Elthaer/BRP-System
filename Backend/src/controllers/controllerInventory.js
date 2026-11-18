import asyncWrapper from "../middleware/asyncWrapper.js";
import Ingredient from "../models/modelIngredient.js";
import Inventory from "../models/modelInventory.js";
import InventoryTransaction, {
  TX_TYPES,
} from "../models/modelInventoryTransaction.js";
import {
  applyStockChange,
  getBalance,
  recordPurchase,
  notifyLowStock,
} from "../services/inventoryService.js";
import { runInTransaction } from "../utils/withTransaction.js";
import { round2, round3 } from "../utils/money.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { emit } from "../utils/socket.js";
import {
  assertId,
  escapeRegex,
  getPagination,
  pageMeta,
  parseDateRange,
} from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const getInventory = asyncWrapper(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.search)
    filter.name = new RegExp(escapeRegex(req.query.search), "i");

  const [ingredients, balances] = await Promise.all([
    Ingredient.find(filter).populate("supplier", "name").sort({ name: 1 }),
    Inventory.find(),
  ]);
  const bal = new Map(balances.map((b) => [String(b.ingredient), b.quantity]));

  let items = ingredients.map((i) => {
    const quantity = round3(bal.get(String(i._id)) ?? 0);
    return {
      ...i.toJSON(),
      quantity,
      isLow: quantity <= i.minStock,
      stockValue: round2(Math.max(quantity, 0) * i.costPerUnit),
    };
  });
  if (req.query.lowStock === "true") items = items.filter((i) => i.isLow);

  send(res, {
    items,
    totalValue: round2(items.reduce((s, i) => s + i.stockValue, 0)),
  });
});

const getTransactions = asyncWrapper(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const { ingredient, type, order } = req.query;
  const filter = {};
  if (ingredient) {
    assertId(ingredient, "ingredient id");
    filter.ingredient = ingredient;
  }
  if (order) {
    assertId(order, "order id");
    filter.order = order;
  }
  if (type) {
    if (!TX_TYPES.includes(type))
      return next(fail("Invalid transaction type", 400));
    filter.type = type;
  }
  if (req.query.from || req.query.to) {
    const { from, to } = parseDateRange(req.query);
    filter.createdAt = { $gte: from, $lte: to };
  }

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate("ingredient", "name unit")
      .populate("supplier", "name")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryTransaction.countDocuments(filter),
  ]);
  send(res, { transactions, ...pageMeta(page, limit, total) });
});

const addPurchase = asyncWrapper(async (req, res, next) => {
  const { ingredient, quantity, unitCost, supplier, note } = req.body;
  assertId(ingredient, "ingredient id");
  if (supplier) assertId(supplier, "supplier id");
  if (!(Number(quantity) > 0))
    return next(fail("Quantity must be greater than 0", 400));
  if (!(Number(unitCost) >= 0))
    return next(fail("Unit cost must be 0 or more", 400));

  const result = await runInTransaction((session) =>
    recordPurchase(
      {
        ingredient,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        supplier,
        note,
        user: req.currentUser,
      },
      session,
    ),
  );

  await logActivity({
    req,
    action: ACTIONS.INVENTORY_PURCHASE,
    entity: "Ingredient",
    entityId: ingredient,
    details: {
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      supplier,
    },
  });
  emit(["inventory", "dashboard"], "inventory:updated", { ingredient });
  send(res, result, 201);
});

const recordWaste = asyncWrapper(async (req, res, next) => {
  const { ingredient, quantity, reason } = req.body;
  assertId(ingredient, "ingredient id");
  const qty = Number(quantity);
  if (!(qty > 0)) return next(fail("Quantity must be greater than 0", 400));
  if (!reason || !String(reason).trim())
    return next(fail("Waste reason is required", 400));

  const result = await runInTransaction(async (session) => {
    if (!(await Ingredient.exists({ _id: ingredient }).session(session)))
      throw fail("Ingredient not found", 404);
    if (qty > (await getBalance(ingredient, session)))
      throw fail("Waste quantity exceeds the current stock", 400);
    return applyStockChange({
      ingredient,
      type: "waste",
      quantity: -qty,
      reason,
      user: req.currentUser,
      session,
    });
  });

  await logActivity({
    req,
    action: ACTIONS.INVENTORY_WASTE,
    entity: "Ingredient",
    entityId: ingredient,
    details: { quantity: qty, reason },
  });
  emit(["inventory", "dashboard"], "inventory:updated", { ingredient });
  notifyLowStock([ingredient]).catch(() => {});
  send(res, result, 201);
});

const stocktake = asyncWrapper(async (req, res, next) => {
  const { items, note } = req.body;
  if (!Array.isArray(items) || !items.length)
    return next(fail("Stocktake items are required", 400));

  const seen = new Set();
  for (const i of items) {
    assertId(i.ingredient, "ingredient id");
    if (seen.has(String(i.ingredient)))
      return next(fail("Duplicate ingredient in stocktake", 400));
    seen.add(String(i.ingredient));
    if (!(Number(i.countedQuantity) >= 0))
      return next(fail("Counted quantity must be 0 or more", 400));
  }

  const ingredients = await Ingredient.find({ _id: { $in: [...seen] } });
  if (ingredients.length !== seen.size)
    return next(fail("One or more ingredients not found", 404));
  const byId = new Map(ingredients.map((i) => [String(i._id), i]));

  const variances = await runInTransaction(async (session) => {
    const out = [];
    for (const i of items) {
      const counted = round3(Number(i.countedQuantity));
      const expected = round3(await getBalance(i.ingredient, session));
      const diff = round3(counted - expected);
      if (diff !== 0) {
        await applyStockChange({
          ingredient: i.ingredient,
          type: "adjustment",
          quantity: diff,
          reason: "Stocktake",
          note,
          user: req.currentUser,
          session,
        });
      }
      const ing = byId.get(String(i.ingredient));
      out.push({
        ingredient: ing._id,
        name: ing.name,
        unit: ing.unit,
        expected,
        counted,
        difference: diff,
        valueDifference: round2(diff * ing.costPerUnit),
      });
    }
    return out;
  });

  const changed = variances.filter((v) => v.difference !== 0);
  await logActivity({
    req,
    action: ACTIONS.INVENTORY_STOCKTAKE,
    entity: "Inventory",
    details: {
      counted: variances.length,
      adjusted: changed.length,
      variances: changed,
    },
  });
  emit(["inventory", "dashboard"], "inventory:updated", {});
  notifyLowStock(changed.map((v) => String(v.ingredient))).catch(() => {});
  send(res, { variances, adjusted: changed.length });
});

export default {
  getInventory,
  getTransactions,
  addPurchase,
  recordWaste,
  stocktake,
};
