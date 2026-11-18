import { Crown, Wallet, ChefHat, Boxes, ShieldCheck } from "lucide-react";

export const ROLE_ORDER = ["owner", "manager", "cashier", "kitchen", "inventory"];

// نفس الأدوار في الباك (utils/userRoles.js)
export const ROLE_META = {
  owner: { label: "Owner", desc: "Full control of the restaurant", icon: Crown, home: "/dashboard" },
  manager: { label: "Manager", desc: "Operations, staff and reports", icon: ShieldCheck, home: "/dashboard" },
  cashier: { label: "Cashier", desc: "POS, payments and invoices", icon: Wallet, home: "/pos" },
  kitchen: { label: "Kitchen", desc: "Prepare and track orders", icon: ChefHat, home: "/kitchen" },
  inventory: { label: "Inventory", desc: "Stock, purchases and suppliers", icon: Boxes, home: "/inventory" },
};

// نفس الصلاحيات في الباك
export const PERM = {
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
};

export const ORDER_TYPES = [
  { key: "dine_in", label: "Dine-in" },
  { key: "takeaway", label: "Takeaway" },
  { key: "delivery", label: "Delivery" },
];

// الأخضر = تمام، الزعفراني = شغال دلوقتي، الطوبي = مشكلة
export const STATUS_META = {
  new: { label: "New", bar: "bg-saffron", pill: "bg-saffron-soft text-saffron" },
  preparing: { label: "Preparing", bar: "bg-leaf", pill: "bg-primary-soft text-brand" },
  ready: { label: "Ready", bar: "bg-primary", pill: "bg-primary text-white" },
  served: { label: "Served", bar: "bg-primary", pill: "bg-primary-soft text-brand" },
  completed: { label: "Completed", bar: "bg-primary", pill: "bg-primary text-white" },
  cancelled: { label: "Cancelled", bar: "bg-brick", pill: "bg-brick-soft text-brick" },
};

export const PAYMENT_META = {
  unpaid: { label: "Unpaid", pill: "bg-saffron-soft text-saffron" },
  paid: { label: "Paid", pill: "bg-primary-soft text-brand" },
  refunded: { label: "Refunded", pill: "bg-brick-soft text-brick" },
};

// الحالة التالية في دورة الأوردر (نفس TRANSITIONS في الباك)
export const NEXT_STATUS = {
  new: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "served", label: "Mark served" },
  served: { to: "completed", label: "Complete", needsPaid: true },
};

export const FIELD_LABELS = {
  tableNumber: "Table number",
  customerName: "Customer name",
  customerPhone: "Customer phone",
  deliveryAddress: "Delivery address",
};

export const INGREDIENT_UNITS = ["g", "kg", "ml", "l", "piece"];
export const TX_TYPES = ["purchase", "consumption", "waste", "adjustment", "return"];
