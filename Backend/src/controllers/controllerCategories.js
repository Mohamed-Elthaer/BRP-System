import asyncWrapper from "../middleware/asyncWrapper.js";

import MenuItem from "../models/modelMenuItem.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { assertId, pick } from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

import Category from "../models/modelCategory.js";

const FIELDS = ["name", "description", "sortOrder", "isActive"];

const getCategories = asyncWrapper(async (req, res) => {
  const filter = req.query.active === "true" ? { isActive: true } : {};
  const data = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  send(res, data);
});

const createCategory = asyncWrapper(async (req, res, next) => {
  const data = pick(req.body, FIELDS);
  if (await Category.exists({ name: data.name }))
    return next(fail("Category already exists", 409));

  const category = await Category.create(data);
  await logActivity({
    req,
    action: ACTIONS.CATEGORY_CHANGE,
    entity: "Category",
    entityId: category._id,
    details: { op: "create", name: category.name },
  });
  send(res, category, 201);
});

const updateCategory = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const category = await Category.findById(req.params.id);
  if (!category) return next(fail("Category not found", 404));

  const data = pick(req.body, FIELDS);
  if (
    data.name &&
    data.name !== category.name &&
    (await Category.exists({ name: data.name }))
  ) {
    return next(fail("Category already exists", 409));
  }
  Object.assign(category, data);
  await category.save();
  await logActivity({
    req,
    action: ACTIONS.CATEGORY_CHANGE,
    entity: "Category",
    entityId: category._id,
    details: { op: "update", changes: data },
  });
  send(res, category);
});

const deleteCategory = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const category = await Category.findById(req.params.id);
  if (!category) return next(fail("Category not found", 404));
  if (await MenuItem.exists({ category: category._id, isArchived: false })) {
    return next(
      fail("Category still has menu items. Move or archive them first", 409),
    );
  }
  await category.deleteOne();
  await logActivity({
    req,
    action: ACTIONS.CATEGORY_CHANGE,
    entity: "Category",
    entityId: category._id,
    details: { op: "delete", name: category.name },
  });
  send(res);
});

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
