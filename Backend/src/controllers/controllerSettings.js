import asyncWrapper from "../middleware/asyncWrapper.js";
import { getSettings } from "../services/settingsService.js";
import { destroyImage } from "../utils/cloudinaryHelpers.js";
import { isValidTimeZone } from "../utils/timezone.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import {
  ROLE_VALUES,
  ROLE_LEVEL,
  getPermissions,
  PERMISSIONS,
} from "../utils/userRoles.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const OBJECT_KEYS = [
  "restaurant",
  "tax",
  "serviceCharge",
  "defaultDiscount",
  "invoice",
];
const VALUE_KEYS = [
  "currency",
  "timezone",
  "maxCashierDiscountPercent",
  "orderTypes",
  "paymentMethods",
  "expenseCategories",
];

const unique = (arr) => new Set(arr).size === arr.length;

const validate = (body) => {
  if (body.timezone !== undefined && !isValidTimeZone(body.timezone))
    throw fail("Invalid timezone", 400);
  if (body.currency !== undefined && !/^[A-Za-z]{3}$/.test(body.currency))
    throw fail("Currency must be a 3-letter code", 400);

  if (body.paymentMethods !== undefined) {
    const list = body.paymentMethods;
    if (!Array.isArray(list) || !list.some((p) => p.enabled !== false))
      throw fail("At least one payment method must be enabled", 400);
    if (!unique(list.map((p) => p.key)))
      throw fail("Payment method keys must be unique", 400);
  }
  if (body.orderTypes !== undefined) {
    const list = body.orderTypes;
    if (!Array.isArray(list) || !list.some((t) => t.enabled !== false))
      throw fail("At least one order type must be enabled", 400);
    if (!unique(list.map((t) => t.key)))
      throw fail("Order type keys must be unique", 400);
  }
  if (body.expenseCategories !== undefined) {
    const list = body.expenseCategories;
    if (
      !Array.isArray(list) ||
      !list.length ||
      list.some((c) => typeof c !== "string" || !c.trim())
    ) {
      throw fail("expenseCategories must be a non-empty list of names", 400);
    }
    body.expenseCategories = list.map((c) => c.trim().toLowerCase());
    if (!unique(body.expenseCategories))
      throw fail("Expense categories must be unique", 400);
  }
};

const getSettingsHandler = asyncWrapper(async (_req, res) => {
  send(res, await getSettings());
});

const updateSettings = asyncWrapper(async (req, res, next) => {
  const body = { ...req.body };
  validate(body);

  const settings = await getSettings();
  const changed = [];

  for (const key of OBJECT_KEYS) {
    if (!body[key] || typeof body[key] !== "object") continue;
    for (const [k, v] of Object.entries(body[key])) {
      if (key === "restaurant" && k === "logo") continue;
      settings.set(`${key}.${k}`, v);
    }
    changed.push(key);
  }
  for (const key of VALUE_KEYS) {
    if (body[key] === undefined) continue;
    settings.set(key, body[key]);
    changed.push(key);
  }
  if (!changed.length) return next(fail("No valid settings provided", 400));

  settings.updatedBy = req.currentUser.id;
  await settings.save();
  await logActivity({
    req,
    action: ACTIONS.SETTINGS_UPDATE,
    entity: "Settings",
    entityId: settings._id,
    details: { changed },
  });
  send(res, settings);
});

const updateLogo = asyncWrapper(async (req, res, next) => {
  if (!req.uploadedImage) return next(fail("Logo image is required", 400));
  const settings = await getSettings();
  const old = settings.restaurant.logo;
  settings.restaurant.logo = req.uploadedImage;
  try {
    await settings.save();
  } catch (err) {
    await destroyImage(req.uploadedImage);
    throw err;
  }
  await destroyImage(old);
  await logActivity({
    req,
    action: ACTIONS.SETTINGS_UPDATE,
    entity: "Settings",
    entityId: settings._id,
    details: { changed: ["restaurant.logo"] },
  });
  send(res, settings);
});

const getRoles = asyncWrapper(async (_req, res) => {
  send(res, {
    roles: ROLE_VALUES.map((role) => ({
      role,
      level: ROLE_LEVEL[role],
      permissions: getPermissions(role),
    })),
    allPermissions: Object.values(PERMISSIONS),
  });
});

export default {
  getSettings: getSettingsHandler,
  updateSettings,
  updateLogo,
  getRoles,
};
