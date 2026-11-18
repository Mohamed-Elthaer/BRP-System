import Ingredient from "../models/modelIngredient.js";
import Recipe from "../models/modelRecipe.js";
import MenuItem from "../models/modelMenuItem.js";
import { round2, round4 } from "../utils/money.js";
import { fail } from "../utils/fail.js";

export const calcRecipeLines = async (items, session) => {
  const ids = items.map((i) => i.ingredient);
  const ingredients = await Ingredient.find({ _id: { $in: ids } }).session(
    session || null,
  );
  const map = new Map(ingredients.map((i) => [String(i._id), i]));

  const lines = items.map((i) => {
    const ing = map.get(String(i.ingredient));
    if (!ing) throw fail("Ingredient not found in recipe", 404);
    return {
      ingredient: ing._id,
      name: ing.name,
      unit: ing.unit,
      quantity: i.quantity,
      unitCost: ing.costPerUnit,
      lineCost: round4(i.quantity * ing.costPerUnit),
    };
  });

  return {
    lines,
    totalCost: round2(lines.reduce((s, l) => s + l.lineCost, 0)),
  };
};


export const recalcMenuItemCost = async (menuItemId, session) => {
  const recipe = await Recipe.findOne({ menuItem: menuItemId }).session(
    session || null,
  );
  const cost = recipe
    ? (await calcRecipeLines(recipe.items, session)).totalCost
    : 0;
  await MenuItem.updateOne({ _id: menuItemId }, { cost }, { session });
  return cost;
};

export const recalcByIngredient = async (ingredientId, session) => {
  const recipes = await Recipe.find({
    "items.ingredient": ingredientId,
  }).session(session || null);
  for (const r of recipes) await recalcMenuItemCost(r.menuItem, session);
};
