import asyncWrapper from "../middleware/asyncWrapper.js";
import MenuItem from "../models/modelMenuItem.js";
import Category from "../models/modelCategory.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { assertId, pick, escapeRegex } from "../utils/queryHelpers.js";
import { destroyImage } from "../utils/cloudinaryHelpers.js";
import { emit } from "../utils/socket.js";
import { PERMISSIONS, hasPermission } from "../utils/userRoles.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const FIELDS = [
  "name",
  "description",
  "category",
  "price",
  "isAvailable",
  "sortOrder",
];

const canSeeCost = (req) =>
  hasPermission(req.currentUser.role, PERMISSIONS.MENU_MANAGE);

const reject = async (req, next, message, code) => {
  await destroyImage(req.uploadedImage);
  return next(fail(message, code));
};

const getMenuItems = asyncWrapper(async (req, res) => {
  const filter = { isArchived: false };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.available === "true") filter.isAvailable = true;
  if (req.query.search)
    filter.name = new RegExp(escapeRegex(req.query.search), "i");

  const query = MenuItem.find(filter)
    .populate("category", "name")
    .sort({ sortOrder: 1, name: 1 });
  if (!canSeeCost(req)) query.select("-cost");
  send(res, await query);
});

const getMenuItem = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const query = MenuItem.findById(req.params.id).populate("category", "name");
  if (!canSeeCost(req)) query.select("-cost");
  const item = await query;
  if (!item || item.isArchived) return next(fail("Menu item not found", 404));
  send(res, item);
});

const createMenuItem = asyncWrapper(async (req, res, next) => {
  const data = pick(req.body, FIELDS);
  assertId(data.category, "category id");
  if (!(await Category.exists({ _id: data.category })))
    return reject(req, next, "Category not found", 404);

  if (await MenuItem.exists({ name: data.name, isArchived: false })) {
    return reject(req, next, "A menu item with this name already exists", 409);
  }

  let item;
  try {
    item = await MenuItem.create({ ...data, image: req.uploadedImage });
  } catch (err) {
    await destroyImage(req.uploadedImage);
    throw err;
  }
  await logActivity({
    req,
    action: ACTIONS.MENU_CREATE,
    entity: "MenuItem",
    entityId: item._id,
    details: { name: item.name, price: item.price },
  });
  send(res, item, 201);
});

const updateMenuItem = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const item = await MenuItem.findById(req.params.id);
  if (!item || item.isArchived)
    return reject(req, next, "Menu item not found", 404);

  const data = pick(req.body, FIELDS);
  if (data.category && String(data.category) !== String(item.category)) {
    assertId(data.category, "category id");
    if (!(await Category.exists({ _id: data.category })))
      return reject(req, next, "Category not found", 404);
  }
  if (
    data.name &&
    data.name !== item.name &&
    (await MenuItem.exists({ name: data.name, isArchived: false }))
  ) {
    return reject(req, next, "A menu item with this name already exists", 409);
  }

  const before = {
    price: item.price,
    name: item.name,
    isAvailable: item.isAvailable,
  };
  Object.assign(item, data);

  let oldImage;
  if (req.uploadedImage) {
    oldImage = item.image;
    item.image = req.uploadedImage;
  }
  try {
    await item.save();
  } catch (err) {
    await destroyImage(req.uploadedImage);
    throw err;
  }
  await destroyImage(oldImage);

  
  await logActivity({
    req,
    action: ACTIONS.MENU_UPDATE,
    entity: "MenuItem",
    entityId: item._id,
    details: { before, changes: data },
  });
  emit(["orders", "kitchen"], "menu:updated", {
    _id: item._id,
    isAvailable: item.isAvailable,
    price: item.price,
  });
  send(res, item);
});


const setAvailability = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  if (typeof req.body.isAvailable !== "boolean")
    return next(fail("isAvailable must be true or false", 400));
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, isArchived: false },
    { isAvailable: req.body.isAvailable },
    { new: true },
  );
  if (!item) return next(fail("Menu item not found", 404));
  await logActivity({
    req,
    action: ACTIONS.MENU_UPDATE,
    entity: "MenuItem",
    entityId: item._id,
    details: { isAvailable: item.isAvailable },
  });
  emit(["orders", "kitchen"], "menu:updated", {
    _id: item._id,
    isAvailable: item.isAvailable,
  });
  send(res, item);
});


const deleteMenuItem = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, isArchived: false },
    { isArchived: true, isAvailable: false },
    { new: true },
  );
  if (!item) return next(fail("Menu item not found", 404));
  await logActivity({
    req,
    action: ACTIONS.MENU_DELETE,
    entity: "MenuItem",
    entityId: item._id,
    details: { name: item.name },
  });
  emit(["orders", "kitchen"], "menu:updated", {
    _id: item._id,
    isAvailable: false,
  });
  send(res);
});

export default {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  setAvailability,
  deleteMenuItem,
};
