import asyncWrapper from "../middleware/asyncWrapper.js";
import Recipe from "../models/modelRecipe.js";
import MenuItem from "../models/modelMenuItem.js";
import Ingredient from "../models/modelIngredient.js";
import {
  calcRecipeLines,
  recalcMenuItemCost,
} from "../services/costService.js";
import { runInTransaction } from "../utils/withTransaction.js";
import { round2 } from "../utils/money.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { assertId } from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const buildBreakdown = async (menuItem, recipe) => {
  const { lines, totalCost } = await calcRecipeLines(recipe.items);
  const profit = round2(menuItem.price - totalCost);
  return {
    menuItem: { _id: menuItem._id, name: menuItem.name, price: menuItem.price },
    notes: recipe.notes,
    items: lines,
    totalCost,
    profit,
    margin: menuItem.price ? round2((profit / menuItem.price) * 100) : 0,
  };
};

const getRecipes = asyncWrapper(async (_req, res) => {
  const [items, recipes] = await Promise.all([
    MenuItem.find({ isArchived: false })
      .populate("category", "name")
      .sort({ name: 1 }),
    Recipe.find().select("menuItem"),
  ]);
  const withRecipe = new Set(recipes.map((r) => String(r.menuItem)));
  send(
    res,
    items.map((m) => ({
      ...m.toJSON(),
      hasRecipe: withRecipe.has(String(m._id)),
    })),
  );
});

const getRecipe = asyncWrapper(async (req, res, next) => {
  assertId(req.params.menuItemId, "menu item id");
  const [menuItem, recipe] = await Promise.all([
    MenuItem.findById(req.params.menuItemId),
    Recipe.findOne({ menuItem: req.params.menuItemId }),
  ]);
  if (!menuItem) return next(fail("Menu item not found", 404));
  if (!recipe) return next(fail("This menu item has no recipe yet", 404));
  send(res, await buildBreakdown(menuItem, recipe));
});

const upsertRecipe = asyncWrapper(async (req, res, next) => {
  const { menuItemId } = req.params;
  assertId(menuItemId, "menu item id");
  const { items, notes } = req.body;

  if (!Array.isArray(items) || !items.length)
    return next(fail("Recipe needs at least one ingredient", 400));

  const merged = new Map();
  for (const i of items) {
    assertId(i.ingredient, "ingredient id");
    const qty = Number(i.quantity);
    if (!(qty > 0))
      return next(fail("Ingredient quantity must be greater than 0", 400));
    merged.set(
      String(i.ingredient),
      (merged.get(String(i.ingredient)) || 0) + qty,
    );
  }
  const recipeItems = [...merged].map(([ingredient, quantity]) => ({
    ingredient,
    quantity,
  }));

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem || menuItem.isArchived)
    return next(fail("Menu item not found", 404));

  const active = await Ingredient.countDocuments({
    _id: { $in: recipeItems.map((i) => i.ingredient) },
    isActive: true,
  });
  if (active !== recipeItems.length)
    return next(fail("One or more ingredients are missing or inactive", 404));

  const recipe = await runInTransaction(async (session) => {
    const doc = await Recipe.findOneAndUpdate(
      { menuItem: menuItemId },
      { items: recipeItems, notes, updatedBy: req.currentUser.id },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      },
    );
    await recalcMenuItemCost(menuItemId, session);
    return doc;
  });

  await logActivity({
    req,
    action: ACTIONS.RECIPE_CHANGE,
    entity: "MenuItem",
    entityId: menuItemId,
    details: { op: "upsert", ingredients: recipeItems.length },
  });
  const fresh = await MenuItem.findById(menuItemId);
  send(res, await buildBreakdown(fresh, recipe));
});

const deleteRecipe = asyncWrapper(async (req, res, next) => {
  const { menuItemId } = req.params;
  assertId(menuItemId, "menu item id");
  const removed = await runInTransaction(async (session) => {
    const r = await Recipe.findOneAndDelete(
      { menuItem: menuItemId },
      { session },
    );
    if (r) await recalcMenuItemCost(menuItemId, session);
    return r;
  });
  if (!removed) return next(fail("Recipe not found", 404));
  await logActivity({
    req,
    action: ACTIONS.RECIPE_CHANGE,
    entity: "MenuItem",
    entityId: menuItemId,
    details: { op: "delete" },
  });
  send(res);
});

export default { getRecipes, getRecipe, upsertRecipe, deleteRecipe };
