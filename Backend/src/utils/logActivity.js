import ActivityLog from "../models/modelActivityLog.js";

export const ACTIONS = Object.freeze({
  ORDER_CREATE: "order.create",
  ORDER_STATUS: "order.status",
  ORDER_CANCEL: "order.cancel",
  PAYMENT_CREATE: "payment.create",
  PAYMENT_REFUND: "payment.refund",
  INVENTORY_PURCHASE: "inventory.purchase",
  INVENTORY_WASTE: "inventory.waste",
  INVENTORY_STOCKTAKE: "inventory.stocktake",
  EXPENSE_CREATE: "expense.create",
  EXPENSE_UPDATE: "expense.update",
  EXPENSE_DELETE: "expense.delete",
  MENU_CREATE: "menu.create",
  MENU_UPDATE: "menu.update",
  MENU_DELETE: "menu.delete",
  CATEGORY_CHANGE: "category.change",
  INGREDIENT_CHANGE: "ingredient.change",
  SUPPLIER_CHANGE: "supplier.change",
  RECIPE_CHANGE: "recipe.change",
  EMPLOYEE_CHANGE: "employee.change",
  SETTINGS_UPDATE: "settings.update",
  SYNC_RESOLVE: "sync.resolve",
});


const logActivity = async ({ req, user, action, entity, entityId, details }) => {
  try {
    const actor = user || req?.currentUser;
    await ActivityLog.create({
      user: actor?.id,
      userRole: actor?.role,
      action,
      entity,
      entityId,
      details,
      ip: req?.ip,
    });
  } catch (err) {
    console.error("activity log failed:", err.message);
  }
};

export default logActivity;