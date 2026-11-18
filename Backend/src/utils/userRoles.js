
const userRole = Object.freeze({
  OWNER: "owner",
  MANAGER: "manager",
  CASHIER: "cashier",
  KITCHEN: "kitchen",
  INVENTORY: "inventory",
});

export const ROLE_VALUES = Object.values(userRole);


export const ROLE_LEVEL = Object.freeze({
  [userRole.OWNER]: 100,
  [userRole.MANAGER]: 50,
  [userRole.CASHIER]: 10,
  [userRole.KITCHEN]: 10,
  [userRole.INVENTORY]: 10,
});


export const PERMISSIONS = Object.freeze({
  POS_USE: "pos.use",
  ORDERS_VIEW: "orders.view",
  ORDERS_UPDATE_STATUS: "orders.update_status",
  ORDERS_CANCEL: "orders.cancel",
  KITCHEN_VIEW: "kitchen.view",
  KITCHEN_UPDATE: "kitchen.update",
  MENU_MANAGE: "menu.manage",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_MANAGE: "inventory.manage",
  EXPENSES_MANAGE: "expenses.manage",
  DASHBOARD_VIEW: "dashboard.view",
  EMPLOYEES_MANAGE: "employees.manage",
  LOGS_VIEW: "logs.view",
  SETTINGS_MANAGE: "settings.manage",
  AI_USE: "ai.use",
});

const ALL = Object.values(PERMISSIONS);

export const rolePermissions = Object.freeze({
  [userRole.OWNER]: ALL,
  [userRole.MANAGER]: ALL.filter((p) => p !== PERMISSIONS.SETTINGS_MANAGE),
  [userRole.CASHIER]: [
    PERMISSIONS.POS_USE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
  ],
  [userRole.KITCHEN]: [PERMISSIONS.KITCHEN_VIEW, PERMISSIONS.KITCHEN_UPDATE],
  [userRole.INVENTORY]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
  ],
});


export const getPermissions = (role) => rolePermissions[role] || [];

export const hasPermission = (role, permission) =>
  getPermissions(role).includes(permission);


export const canManageRole = (actorRole, targetRole) => {
  if (actorRole === userRole.OWNER) return true;
  return (ROLE_LEVEL[actorRole] || 0) > (ROLE_LEVEL[targetRole] || 0);
};

export default userRole;