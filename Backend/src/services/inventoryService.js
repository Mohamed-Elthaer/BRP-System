import Inventory from "../models/modelInventory.js";
import InventoryTransaction from "../models/modelInventoryTransaction.js";
import Ingredient from "../models/modelIngredient.js";
import Recipe from "../models/modelRecipe.js";
import { recalcByIngredient } from "./costService.js";
import { round3, round4 } from "../utils/money.js";
import { fail } from "../utils/fail.js";
import { emit } from "../utils/socket.js";

export const applyStockChange = async ({
  ingredient,
  type,
  quantity,
  unitCost,
  order,
  supplier,
  reason,
  note,
  user,
  session,
}) => {
  const qty = round3(quantity);
  const inv = await Inventory.findOneAndUpdate(
    { ingredient },
    { $inc: { quantity: qty } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session },
  );
  const [tx] = await InventoryTransaction.create(
    [
      {
        ingredient,
        type,
        quantity: qty,
        balanceAfter: round3(inv.quantity),
        unitCost,
        order,
        supplier,
        reason,
        note,
        createdBy: user?.id,
      },
    ],
    { session },
  );
  return { inventory: inv, transaction: tx };
};

export const getBalance = async (ingredient, session) =>
  (await Inventory.findOne({ ingredient }).session(session || null))
    ?.quantity ?? 0;

export const recordPurchase = async (
  { ingredient, quantity, unitCost, supplier, note, user },
  session,
) => {
  const ing = await Ingredient.findById(ingredient).session(session);
  if (!ing) throw fail("Ingredient not found", 404);

  const current = Math.max(await getBalance(ingredient, session), 0);
  const newCost =
    current + quantity > 0
      ? (current * ing.costPerUnit + quantity * unitCost) / (current + quantity)
      : unitCost;

  const result = await applyStockChange({
    ingredient,
    type: "purchase",
    quantity,
    unitCost,
    supplier: supplier || ing.supplier,
    note,
    user,
    session,
  });

  ing.costPerUnit = round4(newCost);
  await ing.save({ session });
  await recalcByIngredient(ing._id, session);
  return result;
};

const consumptionFor = async (items, session) => {
  const ids = [...new Set(items.map((i) => String(i.menuItem)))];
  const recipes = await Recipe.find({ menuItem: { $in: ids } }).session(
    session,
  );
  const byMenu = new Map(recipes.map((r) => [String(r.menuItem), r]));

  const totals = new Map();
  for (const item of items) {
    const recipe = byMenu.get(String(item.menuItem));
    if (!recipe) continue;
    for (const ri of recipe.items) {
      const k = String(ri.ingredient);
      totals.set(k, (totals.get(k) || 0) + ri.quantity * item.quantity);
    }
  }
  return totals;
};

export const deductForOrder = async (order, user, session) => {
  if (order.inventoryDeducted) return [];
  const totals = await consumptionFor(order.items, session);
  for (const [ingredient, qty] of totals) {
    await applyStockChange({
      ingredient,
      type: "consumption",
      quantity: -qty,
      order: order._id,
      reason: `Order ${order.orderNumber}`,
      user,
      session,
    });
  }
  order.inventoryDeducted = true;
  return [...totals.keys()];
};

export const restockForOrder = async (order, user, session) => {
  if (!order.inventoryDeducted) return;
  const totals = await consumptionFor(order.items, session);
  for (const [ingredient, qty] of totals) {
    await applyStockChange({
      ingredient,
      type: "return",
      quantity: qty,
      order: order._id,
      reason: `Order ${order.orderNumber} cancelled`,
      user,
      session,
    });
  }
  order.inventoryDeducted = false;
};

export const notifyLowStock = async (ingredientIds = []) => {
  if (!ingredientIds.length) return;
  const [ingredients, balances] = await Promise.all([
    Ingredient.find({ _id: { $in: ingredientIds }, isActive: true }),
    Inventory.find({ ingredient: { $in: ingredientIds } }),
  ]);
  const bal = new Map(balances.map((b) => [String(b.ingredient), b.quantity]));
  const low = ingredients
    .filter((i) => (bal.get(String(i._id)) ?? 0) <= i.minStock)
    .map((i) => ({
      _id: i._id,
      name: i.name,
      unit: i.unit,
      minStock: i.minStock,
      quantity: bal.get(String(i._id)) ?? 0,
    }));
  if (low.length) emit(["inventory", "dashboard"], "inventory:low", low);
};
