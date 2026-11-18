import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./Slices/authSlice.js";
import uiReducer from "./Slices/uiSlice.js";
import settingsReducer from "./Slices/settingsSlice.js";
import categoryReducer from "./Slices/categoriesSlice.js";
import menuReducer from "./Slices/menuSlice.js";
import ingredientReducer from "./Slices/ingredientsSlice.js";
import supplierReducer from "./Slices/suppliersSlice.js";
import recipesReducer from "./Slices/recipesSlice.js";
import inventoryReducer, { inventoryTxReducer } from "./Slices/inventorySlice.js";
import ordersReducer from "./Slices/ordersSlice.js";
import kitchenReducer from "./Slices/kitchenSlice.js";
import posReducer from "./Slices/posSlice.js";
import paymentsReducer from "./Slices/paymentsSlice.js";
import invoicesReducer from "./Slices/invoicesSlice.js";
import { expensesReducer, expenseSummaryReducer } from "./Slices/expensesSlice.js";
import dashboardReducer from "./Slices/dashboardSlice.js";
import logsReducer from "./Slices/logsSlice.js";
import syncReducer from "./Slices/syncSlice.js";
import usersReducer from "./Slices/usersSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    settings: settingsReducer,
    category: categoryReducer,
    menu: menuReducer,
    ingredient: ingredientReducer,
    supplier: supplierReducer,
    recipes: recipesReducer,
    inventory: inventoryReducer,
    inventoryTx: inventoryTxReducer,
    orders: ordersReducer,
    kitchen: kitchenReducer,
    pos: posReducer,
    payments: paymentsReducer,
    invoices: invoicesReducer,
    expenses: expensesReducer,
    expenseSummary: expenseSummaryReducer,
    dashboard: dashboardReducer,
    logs: logsReducer,
    sync: syncReducer,
    users: usersReducer,
  },
  // بنبعت File objects (صور/إيصالات) كـ thunk args
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});
