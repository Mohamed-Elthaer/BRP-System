const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const url = require("url");
const http = require("http");

let autoUpdater = null;
try {
  ({ autoUpdater } = require("electron-updater"));
} catch (_) {}

// Single instance lock to prevent multiple conflicting processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Choose data directory with sufficient disk space (fallback to D:\BRP-System-Data if C:\ is nearly full)
function resolveUserDataDir() {
  try {
    if (fs.existsSync("D:\\")) {
      const cStats = fs.statfsSync ? fs.statfsSync("C:\\") : null;
      const freeBytes = cStats ? cStats.bavail * cStats.bsize : 5 * 1024 * 1024 * 1024;
      if (freeBytes < 1.5 * 1024 * 1024 * 1024) {
        const dPath = "D:\\BRP-System-Data";
        if (!fs.existsSync(dPath)) fs.mkdirSync(dPath, { recursive: true });
        return dPath;
      }
    }
  } catch (_) {}
  return app.getPath("userData");
}

const activeUserDataDir = resolveUserDataDir();
let mainWindow = null;
const logPath = path.join(activeUserDataDir, "brp-error.log");

const origConsoleLog = console.log;
const origConsoleErr = console.error;
let _isLogging = false;

function logError(message, err) {
  const errMsg = `${new Date().toISOString()} - ${message}: ${err?.stack || err || ""}\n`;
  try {
    fs.appendFileSync(logPath, errMsg);
  } catch (_) {}
  origConsoleErr.call(console, message, err || "");
}

process.on("uncaughtException", (err) => {
  logError("Uncaught Exception in Main Process", err);
});
process.on("unhandledRejection", (reason) => {
  logError("Unhandled Rejection in Main Process", reason);
});

function formatLogArg(a) {
  if (a === null || a === undefined) return String(a);
  if (a instanceof Error || (typeof a === "object" && ("message" in a || "stack" in a))) {
    return a.stack || a.message || String(a);
  }
  if (typeof a === "object") {
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  }
  return String(a);
}

console.log = function (...args) {
  origConsoleLog.apply(console, args);
  if (_isLogging) return;
  _isLogging = true;
  try {
    const text = args.map(formatLogArg).join(" ");
    fs.appendFileSync(logPath, `${new Date().toISOString()} - [Server Log] ${text}\n`);
  } catch (_) {} finally {
    _isLogging = false;
  }
};

console.error = function (...args) {
  origConsoleErr.apply(console, args);
  if (_isLogging) return;
  _isLogging = true;
  try {
    const text = args.map(formatLogArg).join(" ");
    fs.appendFileSync(logPath, `${new Date().toISOString()} - [Server Error] ${text}\n`);
  } catch (_) {} finally {
    _isLogging = false;
  }
};

// Start the embedded Express + Local MongoDB server in production / Electron
let stopDbFn = null;
let stopSyncFn = null;

async function startServer() {
  try {
    const resourceServerPath = process.resourcesPath
      ? path.join(process.resourcesPath, "server", "server.js")
      : null;
    const prodServerPath = path.join(__dirname, "server", "server.js").replace("app.asar", "app.asar.unpacked");
    const devServerPath = path.resolve(__dirname, "..", "..", "Backend", "server.js");
    const serverPath = [resourceServerPath, prodServerPath, devServerPath].find(
      (p) => p && fs.existsSync(p)
    );

    if (serverPath) {
      logError(`🚀 Starting embedded BRP-System Express server from: ${serverPath}`, "");

      process.env.PORT = "5000";
      process.env.NODE_ENV = "production";
      process.env.ELECTRON_APP = "true";
      process.env.OFFLINE_FIRST = "true";
      process.env.APPDATA = app.getPath("appData");
      process.env.USER_DATA_PATH = activeUserDataDir;

      const bundledMongod = path.join(path.dirname(serverPath), "mongodb-bin", "mongod.exe");
      if (fs.existsSync(bundledMongod)) {
        process.env.MONGOD_BINARY_PATH = bundledMongod;
        logError(`✓ Using bundled mongod.exe: ${bundledMongod}`, "");
      }

      const serverFileUrl = url.pathToFileURL(serverPath).href;
      const serverMod = await import(serverFileUrl);
      if (typeof serverMod.shutdownServer === "function") {
        stopDbFn = serverMod.shutdownServer;
      }
      logError("✓ Embedded BRP-System server module loaded.", "");
    } else {
      logError("ℹ Embedded server entry point not found: " + prodServerPath, "");
    }
  } catch (err) {
    logError("❌ Failed to start embedded server", err);
  }
}

async function waitForServerReady(timeoutMs = 15000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const ready = await new Promise((resolve) => {
      const req = http.get("http://localhost:5000/api/health", (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(600, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function createWindow() {
  try {
    fs.writeFileSync(logPath, `BRP-System Log started at ${new Date().toISOString()}\n`);
  } catch (_) {}

  // Start background API + Local DB server
  startServer();

  const iconPath = fs.existsSync(path.join(__dirname, "icon.png"))
    ? path.join(__dirname, "icon.png")
    : path.join(__dirname, "..", "build", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: "Mat3amy — Restaurant ERP",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#0F1713",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Keep sync & sockets running smoothly when minimized
    },
  });

  // Enable F12 / Ctrl+Shift+I to toggle DevTools for diagnostics
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logError(`[Renderer Console L${level}] ${message} (${sourceId}:${line})`, "");
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logError(`[did-fail-load] code=${errorCode}, desc=${errorDescription}, url=${validatedURL}`, "");
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logError(`[render-process-gone] reason=${details.reason}, exitCode=${details.exitCode}`, "");
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 4000);

  const loadApp = async () => {
    const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
    const prodPath = path.join(__dirname, "..", "dist", "index.html");

    if (isDev && !fs.existsSync(prodPath)) {
      logError("Loading dev URL http://localhost:5173", "");
      try {
        await mainWindow.loadURL("http://localhost:5173");
        return;
      } catch (err) {
        logError("Failed to load dev server URL", err);
      }
    }

    // Wait for embedded server + local DB to finish booting
    logError("Waiting for embedded BRP server readiness...", "");
    const ready = await waitForServerReady(15000);
    if (ready) {
      logError("✓ Embedded server responded OK to /api/health.", "");
      // Prefer loading from embedded server http://localhost:5000 so httpOnly cookies & BrowserRouter are same-origin!
      try {
        await mainWindow.loadURL("http://localhost:5000");
        logError("✓ Loaded UI from embedded server http://localhost:5000.", "");
        return;
      } catch (serverUrlErr) {
        logError("Could not load http://localhost:5000, falling back to local file...", serverUrlErr);
      }
    } else {
      logError("⚠ Embedded server did not answer /api/health within timeout, proceeding to load local bundle.", "");
    }

    // Fallback 1: load local dist/index.html via file://
    if (fs.existsSync(prodPath)) {
      try {
        const fileUrl = url.pathToFileURL(prodPath).href;
        await mainWindow.loadURL(fileUrl);
        logError("✓ Loaded local bundle via file URL.", "");
        return;
      } catch (fileErr) {
        logError("Failed to load via file URL, attempting loadFile...", fileErr);
      }

      try {
        await mainWindow.loadFile(prodPath);
        return;
      } catch (loadFileErr) {
        logError("Failed loadFile", loadFileErr);
      }
    }

    // Fallback 2: dev server
    try {
      await mainWindow.loadURL("http://localhost:5173");
    } catch (fallbackErr) {
      logError("All load attempts failed", fallbackErr);
      dialog.showErrorBox(
        "خطأ في تحميل واجهة البرنامج",
        "تعذر تحميل واجهة التطبيق.\nيرجى إعادة تشغيل البرنامج أو فحص ملف السجل."
      );
    }
  };

  loadApp();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", async () => {
  if (stopDbFn) {
    try {
      await stopDbFn();
    } catch (_) {}
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("is-packaged", () => app.isPackaged);

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.logger = {
    info: (msg) => logError(`[AutoUpdater INFO] ${msg}`, ""),
    warn: (msg) => logError(`[AutoUpdater WARN] ${msg}`, ""),
    error: (msg) => logError(`[AutoUpdater ERROR] ${msg}`, ""),
  };

  autoUpdater.on("update-available", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-available", info);
    }
  });

  autoUpdater.on("download-progress", (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-download-progress", progressObj);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-downloaded", info);
    }

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "تحديث جديد متوفر — Mat3amy",
        message: `تم تنزيل التحديث الجديد (v${info.version}) بنجاح!\n\nهل تريد إعادة تشغيل التطبيق وتثبيت التحديث الآن؟`,
        buttons: ["إعادة التشغيل والتحديث الآن", "لاحقاً عند إغلاق البرنامج"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((res) => {
        if (res.response === 0) {
          autoUpdater.quitAndInstall();
        }
      })
      .catch(() => {});
  });

  autoUpdater.on("error", (err) => {
    logError("AutoUpdater error", err);
  });

  if (app.isPackaged) {
    const updateConfigPath = path.join(process.resourcesPath || "", "app-update.yml");
    if (fs.existsSync(updateConfigPath)) {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          logError("Automatic check for updates failed", err);
        });
      }, 6000);
    }
  }
}

ipcMain.handle("check-for-updates", async () => {
  if (!app.isPackaged || !autoUpdater) {
    return {
      status: "dev-mode",
      message: "التحديث التلقائي يعمل في النسخة المثبتة المجمعة فقط (Production Build)",
    };
  }
  try {
    const checkResult = await autoUpdater.checkForUpdates();
    return { status: "success", updateInfo: checkResult?.updateInfo };
  } catch (err) {
    return { status: "error", error: err?.message || "فشل فحص التحديثات" };
  }
});

ipcMain.handle("quit-and-install", () => {
  if (autoUpdater) autoUpdater.quitAndInstall();
});
