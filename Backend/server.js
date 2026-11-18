import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import httpStatusText from "./src/utils/httpStatusText.js";
import { connectDB } from "./src/config/db.js";

import routerUser from "./src/routers/RouterUser.js";
import routerCategories from "./src/routers/routerCategories.js";
import routerActivityLogs from "./src/routers/routerActivityLogs.js";
import routerMenuItems from "./src/routers/routerMenuItems.js";
import routerIngredients from "./src/routers/routerIngredients.js";
import routerSuppliers from "./src/routers/routerSuppliers.js";
import routerRecipes from "./src/routers/routerRecipes.js";
import routerOrders from "./src/routers/routerOrders.js";
import routerPayments from "./src/routers/routerPayments.js";
import routerInvoices from "./src/routers/routerInvoices.js";
import routerKitchen from "./src/routers/routerKitchen.js";
import routerExpenses from "./src/routers/routerExpenses.js";
import routerInventory from "./src/routers/routerInventory.js";
import routerDashboard from "./src/routers/routerDashboard.js";
import routerSettings from "./src/routers/routerSettings.js";
import routerSync from "./src/routers/routerSync.js";
import { initSocket } from "./src/utils/socket.js";
import dbGuard from "./src/middleware/dbGuard.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());
connectDB();
app.use(dbGuard);
app.use("/api/users", routerUser);
app.use("/api/categories", routerCategories);
app.use("/api/activity-logs", routerActivityLogs);
app.use("/api/menu-items", routerMenuItems);
app.use("/api/ingredients", routerIngredients);
app.use("/api/suppliers", routerSuppliers);
app.use("/api/recipes", routerRecipes);
app.use("/api/orders", routerOrders);
app.use("/api/payments", routerPayments);
app.use("/api/invoices", routerInvoices);
app.use("/api/kitchen", routerKitchen);
app.use("/api/expenses", routerExpenses);
app.use("/api/inventory", routerInventory);
app.use("/api/dashboard", routerDashboard);
app.use("/api/sync", routerSync);
app.use("/api/settings", routerSettings);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Restaurant ERP API is running",
  });
});

app.use((req, res) => {
  return res
    .status(404)
    .json({ status: httpStatusText.ERROR, message: "Route not found" });
});

app.use((error, req, res, next) => {
  return res
    .status(error.statusCode || 500)
    .json({
      status: error.statusText || httpStatusText.ERROR,
      message: error.message,
      code: error.statusCode || 500,
      data: null,
    });
});

const httpServer = http.createServer(app);

initSocket(httpServer);
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
