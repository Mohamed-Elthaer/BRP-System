import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from multiple possible locations (dev, packaged Electron, workspace root)
dotenv.config();
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import httpStatusText from "./src/utils/httpStatusText.js";
import { connectDB, getDbMode, stopEmbeddedDB } from "./src/config/db.js";
import { getUploadsDir } from "./src/utils/cloudinaryHelpers.js";
import { getCloudSyncStatus, startCloudSyncEngine, stopCloudSyncEngine } from "./src/services/cloudSyncEngine.js";

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
import routerAi from "./src/routers/routerAi.js";
import { initSocket } from "./src/utils/socket.js";
import dbGuard from "./src/middleware/dbGuard.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: (_requestOrigin, callback) => {
      // Allow requests from Electron (file://, null, localhost:5000), Vite dev (5173), and LAN clients
      callback(null, true);
    },
    credentials: true,
  }),
);
app.use(cookieParser());

// Serve locally saved offline images and receipts
app.use("/uploads", express.static(getUploadsDir()));

// Health check endpoints (before dbGuard so Electron can check readiness)
const healthHandler = (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    dbMode: getDbMode(),
    cloud: getCloudSyncStatus(),
    message: "Restaurant ERP API is running",
  });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api", dbGuard);
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
app.use("/api/ai", routerAi);

// Serve static compiled Frontend (dist) if available (same-origin cookie & BrowserRouter support)
const possibleDistPaths = [
  path.resolve(__dirname, "../../dist"),
  path.resolve(__dirname, "../dist"),
  path.resolve(__dirname, "../frontend/dist"),
  path.resolve(__dirname, "../../frontend/dist"),
  process.resourcesPath ? path.join(process.resourcesPath, "app.asar", "dist") : null,
  process.resourcesPath ? path.join(process.resourcesPath, "app.asar.unpacked", "dist") : null,
].filter(Boolean);
const clientDistPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, "index.html")));

if (clientDistPath) {
  console.log(`[Server] Serving static frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get("/{*splat}", (req, res, next) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads") && !req.path.startsWith("/socket.io")) {
      return res.sendFile(path.join(clientDistPath, "index.html"));
    }
    next();
  });
}

app.use((req, res) => {
  return res
    .status(404)
    .json({ status: httpStatusText.ERROR, message: "Route not found" });
});

app.use((error, req, res, _next) => {
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

const PORT = process.env.PORT || 5000;

async function bootstrapServer() {
  await connectDB();
  startCloudSyncEngine(30000);

  httpServer.listen(PORT, () => {
    console.log(`[Server] BRP-System API running on http://localhost:${PORT} (DB mode: ${getDbMode()})`);
  });

  httpServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[Server] Port ${PORT} already in use. Retaining existing service.`);
    } else {
      console.error("[Server] HTTP server error:", err);
    }
  });
}

bootstrapServer().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
});

export async function shutdownServer() {
  stopCloudSyncEngine();
  try {
    httpServer.close();
  } catch {}
  await stopEmbeddedDB();
}


