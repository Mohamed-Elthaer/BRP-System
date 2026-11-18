import asyncWrapper from "../middleware/asyncWrapper.js";
import Ingredient from "../models/modelIngredient.js";
import Supplier from "../models/modelSupplier.js";
import Recipe from "../models/modelRecipe.js";
import { recalcByIngredient } from "../services/costService.js";

import { runInTransaction } from "../utils/withTransaction.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { assertId, pick, escapeRegex } from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const FIELDS = [
  "name",
  "unit",
  "costPerUnit",
  "minStock",
  "supplier",
  "isActive",
];

const getIngredients = asyncWrapper(async (req, res) => {
  const filter = {};
  if (req.query.active === "true") filter.isActive = true;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  if (req.query.search)
    filter.name = new RegExp(escapeRegex(req.query.search), "i");
  send(
    res,
    await Ingredient.find(filter)
      .populate("supplier", "name")
      .sort({ name: 1 }),
  );
});

const getIngredient = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const ingredient = await Ingredient.findById(req.params.id).populate(
    "supplier",
    "name",
  );
  if (!ingredient) return next(fail("Ingredient not found", 404));
  send(res, ingredient);
});

const createIngredient = asyncWrapper(async (req, res, next) => {
  const data = pick(req.body, FIELDS);
  if (await Ingredient.exists({ name: data.name }))
    return next(fail("Ingredient already exists", 409));
  if (data.supplier) {
    assertId(data.supplier, "supplier id");
    if (!(await Supplier.exists({ _id: data.supplier })))
      return next(fail("Supplier not found", 404));
  }
  const ingredient = await Ingredient.create(data);
  await logActivity({
    req,
    action: ACTIONS.INGREDIENT_CHANGE,
    entity: "Ingredient",
    entityId: ingredient._id,
    details: { op: "create", name: ingredient.name },
  });
  send(res, ingredient, 201);
});

const updateIngredient = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const ingredient = await Ingredient.findById(req.params.id);
  if (!ingredient) return next(fail("Ingredient not found", 404));

  const data = pick(req.body, FIELDS);
  if (
    data.name &&
    data.name !== ingredient.name &&
    (await Ingredient.exists({ name: data.name }))
  ) {
    return next(fail("Ingredient already exists", 409));
  }

  if (
    data.unit &&
    data.unit !== ingredient.unit &&
    (await Recipe.exists({ "items.ingredient": ingredient._id }))
  ) {
    return next(
      fail("Cannot change the unit of an ingredient used in recipes", 409),
    );
  }
  if (data.supplier) {
    assertId(data.supplier, "supplier id");
    if (!(await Supplier.exists({ _id: data.supplier })))
      return next(fail("Supplier not found", 404));
  }

  const costChanged =
    data.costPerUnit !== undefined &&
    data.costPerUnit !== ingredient.costPerUnit;
  const before = {
    costPerUnit: ingredient.costPerUnit,
    minStock: ingredient.minStock,
  };

  await runInTransaction(async (session) => {
    const doc = await Ingredient.findById(ingredient._id).session(session);
    Object.assign(doc, data);
    await doc.save({ session });
    if (costChanged) await recalcByIngredient(doc._id, session);
  });

  await logActivity({
    req,
    action: ACTIONS.INGREDIENT_CHANGE,
    entity: "Ingredient",
    entityId: ingredient._id,
    details: { op: "update", before, changes: data },
  });
  send(
    res,
    await Ingredient.findById(ingredient._id).populate("supplier", "name"),
  );
});

const deleteIngredient = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const ingredient = await Ingredient.findById(req.params.id);
  if (!ingredient) return next(fail("Ingredient not found", 404));
  if (await Recipe.exists({ "items.ingredient": ingredient._id })) {
    return next(
      fail("Ingredient is used in recipes. Remove it from them first", 409),
    );
  }
  ingredient.isActive = false; 
  await ingredient.save();
  await logActivity({
    req,
    action: ACTIONS.INGREDIENT_CHANGE,
    entity: "Ingredient",
    entityId: ingredient._id,
    details: { op: "deactivate" },
  });
  send(res, ingredient);
});

export default {
  getIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
};
