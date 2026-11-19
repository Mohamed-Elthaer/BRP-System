import dns from "dns";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { recordLocalMutation } from "../services/cloudSyncEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from multiple candidate paths (dev, packaged Electron, workspace root)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

let embeddedMongoServer = null;
let activeDbMode = "uninitialized"; // 'local' | 'cloud'

export const getDbMode = () => activeDbMode;

export const getDataRootDir = () => {
  if (process.env.USER_DATA_PATH) {
    if (!fs.existsSync(process.env.USER_DATA_PATH)) {
      fs.mkdirSync(process.env.USER_DATA_PATH, { recursive: true });
    }
    return process.env.USER_DATA_PATH;
  }

  // Prefer D:\BRP-System-Data if C:\ has less than 2GB free and D:\ exists
  if (fs.existsSync("D:\\")) {
    try {
      const dBase = "D:\\BRP-System-Data";
      if (!fs.existsSync(dBase)) fs.mkdirSync(dBase, { recursive: true });
      return dBase;
    } catch {}
  }

  const base = process.env.APPDATA
    ? path.join(process.env.APPDATA, "BRP-System")
    : path.resolve(__dirname, "../../local_data");
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
};

// Global Mongoose plugin to capture all local mutations for Cloud Sync
mongoose.plugin((schema) => {
  schema.post("save", function (doc) {
    if (doc && !doc.$locals?.skipCloudSync) {
      const col = doc.constructor?.collection?.collectionName;
      if (col) recordLocalMutation(col, doc._id, "upsert");
    }
  });

  schema.post("findOneAndUpdate", function (doc) {
    if (doc && !this.getOptions()?.skipCloudSync) {
      const col = this.model?.collection?.collectionName;
      if (col) recordLocalMutation(col, doc._id, "upsert");
    }
  });

  schema.post("findOneAndDelete", function (doc) {
    if (doc && !this.getOptions()?.skipCloudSync) {
      const col = this.model?.collection?.collectionName;
      if (col) recordLocalMutation(col, doc._id, "delete");
    }
  });

  schema.post("insertMany", function (docs) {
    const col = this.collection?.collectionName || docs?.[0]?.constructor?.collection?.collectionName;
    if (col && Array.isArray(docs)) {
      for (const d of docs) {
        if (d?._id && !d.$locals?.skipCloudSync) {
          recordLocalMutation(col, d._id, "upsert");
        }
      }
    }
  });
});

async function startOrConnectLocalMongo() {
  // 1. If explicit LOCAL_MONGO_URL is set or local mongod is already running on 27018/27017
  const candidateUrls = [
    process.env.LOCAL_MONGO_URL,
    "mongodb://127.0.0.1:27018/rest-ERP?directConnection=true",
  ].filter(Boolean);

  for (const url of candidateUrls) {
    try {
      await mongoose.connect(url, {
        serverSelectionTimeoutMS: 1800,
        connectTimeoutMS: 1800,
      });
      activeDbMode = "local";
      console.log(`[DB] Connected to local MongoDB at ${url}`);
      return true;
    } catch {
      // Proceed to start embedded MongoMemoryServer
    }
  }

  // 2. Start embedded persistent MongoMemoryServer with dbPath in USER_DATA_PATH
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const dbPath = path.join(getDataRootDir(), "mongodb-data");
    const binDir = path.join(getDataRootDir(), "mongodb-binaries");
    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    // Clean stale mongod.lock if process crashed previously
    const lockFile = path.join(dbPath, "mongod.lock");
    if (fs.existsSync(lockFile)) {
      try {
        const stat = fs.statSync(lockFile);
        if (stat.size > 0) fs.unlinkSync(lockFile);
      } catch {}
    }

    // Check if packaged binary exists in extraResources, D:\BRP-System-Data, or local_binaries
    const packagedBinCandidates = [
      process.env.MONGOD_BINARY_PATH,
      "D:\\BRP-System-Data\\mongodb-binaries\\mongod.exe",
      path.join(binDir, "mongod.exe"),
      path.resolve(__dirname, "../../mongodb-bin/mongod.exe"),
      path.resolve(__dirname, "../../../mongodb-bin/mongod.exe"),
      process.resourcesPath ? path.join(process.resourcesPath, "mongodb-bin", "mongod.exe") : null,
    ].filter(Boolean);

    const existingBinary = packagedBinCandidates.find((p) => fs.existsSync(p));

    console.log(`[DB] Starting embedded persistent MongoDB (data: ${dbPath})...`);
    embeddedMongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27018,
        ip: "127.0.0.1",
        dbName: "rest-ERP",
        dbPath,
        storageEngine: "wiredTiger",
      },
      binary: existingBinary
        ? { systemBinary: existingBinary }
        : { downloadDir: binDir, version: "6.0.14" },
    });

    const localUri = embeddedMongoServer.getUri("rest-ERP");
    await mongoose.connect(localUri);
    activeDbMode = "local";
    console.log(`[DB] Embedded Local MongoDB ready at ${localUri}`);
    return true;
  } catch (err) {
    console.warn("[DB] Could not start embedded local MongoDB:", err.message);
    return false;
  }
}

export const connectDB = async () => {
  // Only adjust DNS if we have an IPv6 link-local fallback issue
  try {
    const servers = dns.getServers();
    if (servers.length === 1 && servers[0] === "127.0.0.1") {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }
  } catch {}

  const preferLocal =
    process.env.ELECTRON_APP === "true" ||
    process.env.OFFLINE_FIRST !== "false";

  if (preferLocal) {
    const ok = await startOrConnectLocalMongo();
    if (ok) return;
  }

  // Fallback to Cloud MongoDB Atlas directly if local embedded engine was not started
  const cloudUrl = process.env.CLOUD_MONGO_URL || process.env.MONGO_URL;
  if (cloudUrl) {
    try {
      await mongoose.connect(cloudUrl, {
        serverSelectionTimeoutMS: 8000,
      });
      activeDbMode = "cloud";
      console.log("[DB] Connected directly to Cloud MongoDB Atlas");
    } catch (err) {
      console.error("[DB] Cloud MongoDB connection failed:", err.message);
      // Last resort: try local DB if we hadn't tried yet
      if (!preferLocal) {
        await startOrConnectLocalMongo();
      }
    }
  }
};

export const stopEmbeddedDB = async () => {
  try {
    await mongoose.disconnect();
  } catch {}
  if (embeddedMongoServer) {
    try {
      await embeddedMongoServer.stop();
    } catch {}
  }
};
