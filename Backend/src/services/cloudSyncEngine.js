import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import { getDataRootDir, getDbMode } from "../config/db.js";
import { getUploadsDir } from "../utils/cloudinaryHelpers.js";
import { emit } from "../utils/socket.js";

/**
 * Collections synchronized between Local Embedded MongoDB and Cloud MongoDB Atlas.
 */
const SYNC_COLLECTIONS = [
  "users",
  "settings",
  "categories",
  "suppliers",
  "ingredients",
  "inventories",
  "menuitems",
  "recipes",
  "counters",
  "orders",
  "orderstatushistories",
  "payments",
  "invoices",
  "inventorytransactions",
  "expenses",
  "activitylogs",
  "syncoperations",
];

// Natural unique key configurations to resolve upsert conflicts gracefully
const NATURAL_UNIQUE_KEYS = {
  settings: ["key"],
  counters: ["key"],
  users: ["email"],
  categories: ["name"],
  suppliers: ["name"],
  ingredients: ["name"],
  inventories: ["ingredient"],
  recipes: ["menuItem"],
};

let cloudConn = null;
let cloudConnecting = false;
let syncTimer = null;
let immediateTimer = null;
let isSyncing = false;
let suppressMutationCapture = false;

const syncState = {
  cloudConfigured: false,
  cloudConnected: false,
  syncing: false,
  lastSyncedAt: null,
  lastPushCount: 0,
  lastPullCount: 0,
  pendingOutboxCount: 0,
  lastError: null,
  collectionTimestamps: {},
};

// In-memory outbox backed by JSON disk persistence in USER_DATA_PATH
// Key: `${collectionName}:${docId}` -> { col, id, op, ts }
const outboxMap = new Map();
let outboxLoaded = false;

function getSyncStateFilePath() {
  return path.join(getDataRootDir(), "cloud-sync-state.json");
}

function loadPersistedSyncState() {
  if (outboxLoaded) return;
  outboxLoaded = true;
  try {
    const filePath = getSyncStateFilePath();
    if (!fs.existsSync(filePath)) return;
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (raw.collectionTimestamps && typeof raw.collectionTimestamps === "object") {
      syncState.collectionTimestamps = raw.collectionTimestamps;
    }
    if (raw.lastSyncedAt) {
      syncState.lastSyncedAt = raw.lastSyncedAt;
    }
    if (Array.isArray(raw.outbox)) {
      for (const item of raw.outbox) {
        if (item?.col && item?.id) {
          outboxMap.set(`${item.col}:${item.id}`, item);
        }
      }
    }
    syncState.pendingOutboxCount = outboxMap.size;
  } catch (err) {
    console.warn("[CloudSync] Failed to load persisted sync state:", err.message);
  }
}

function savePersistedSyncState() {
  try {
    const filePath = getSyncStateFilePath();
    const payload = {
      lastSyncedAt: syncState.lastSyncedAt,
      collectionTimestamps: syncState.collectionTimestamps,
      outbox: Array.from(outboxMap.values()),
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
    syncState.pendingOutboxCount = outboxMap.size;
  } catch (err) {
    console.warn("[CloudSync] Failed to save sync state:", err.message);
  }
}

/**
 * Called automatically by the global Mongoose plugin whenever a local document is saved/updated/deleted.
 */
export function recordLocalMutation(collectionName, docId, op = "upsert") {
  if (suppressMutationCapture) return;
  if (getDbMode() !== "local") return;
  if (!collectionName || !docId) return;
  const col = String(collectionName).toLowerCase();
  if (!SYNC_COLLECTIONS.includes(col)) return;

  loadPersistedSyncState();
  const idStr = String(docId);
  outboxMap.set(`${col}:${idStr}`, {
    col,
    id: idStr,
    op,
    ts: new Date().toISOString(),
  });
  savePersistedSyncState();

  // Trigger a debounced background push (1.5s after write)
  triggerDebouncedSync(1500);
}

export function triggerDebouncedSync(delayMs = 1500) {
  if (immediateTimer) clearTimeout(immediateTimer);
  immediateTimer = setTimeout(() => {
    immediateTimer = null;
    runCloudSyncCycle().catch(() => {});
  }, delayMs);
}

export function getCloudSyncStatus() {
  loadPersistedSyncState();
  const cloudUrl = process.env.CLOUD_MONGO_URL || process.env.MONGO_URL || "";
  return {
    dbMode: getDbMode(),
    cloudConfigured: Boolean(cloudUrl && cloudUrl.includes("mongodb")),
    cloudConnected: Boolean(cloudConn && cloudConn.readyState === 1),
    syncing: isSyncing,
    lastSyncedAt: syncState.lastSyncedAt,
    lastPushCount: syncState.lastPushCount,
    lastPullCount: syncState.lastPullCount,
    pendingOutboxCount: outboxMap.size,
    lastError: syncState.lastError,
  };
}

async function ensureCloudConnection() {
  const cloudUrl = process.env.CLOUD_MONGO_URL || process.env.MONGO_URL;
  if (!cloudUrl) {
    syncState.cloudConfigured = false;
    syncState.cloudConnected = false;
    return null;
  }
  syncState.cloudConfigured = true;

  // If the primary mongoose connection IS already the cloud DB, no separate sync connection is needed
  if (getDbMode() === "cloud") {
    syncState.cloudConnected = mongoose.connection.readyState === 1;
    return null;
  }

  if (cloudConn && cloudConn.readyState === 1) {
    syncState.cloudConnected = true;
    return cloudConn;
  }

  if (cloudConnecting) return null;
  cloudConnecting = true;

  try {
    if (cloudConn) {
      await cloudConn.close().catch(() => {});
      cloudConn = null;
    }

    const conn = mongoose.createConnection(cloudUrl, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 15000,
    });

    await conn.asPromise();
    cloudConn = conn;
    syncState.cloudConnected = true;
    syncState.lastError = null;
    return cloudConn;
  } catch (err) {
    syncState.cloudConnected = false;
    syncState.lastError = err.message;
    return null;
  } finally {
    cloudConnecting = false;
  }
}

/**
 * If a document contains a local upload (`public_id: "local:..."`), upload it to Cloudinary
 * before pushing the document to Cloud MongoDB Atlas.
 */
async function promoteLocalUploadsInDoc(col, doc) {
  let changed = false;

  const tryPromoteFile = async (fileObj, folder = "matjari") => {
    if (!fileObj?.public_id || !String(fileObj.public_id).startsWith("local:")) {
      return fileObj;
    }
    const relPath = String(fileObj.public_id).slice(6);
    const fullPath = path.join(getUploadsDir(), relPath);
    if (!fs.existsSync(fullPath)) return fileObj;

    try {
      const res = await cloudinary.uploader.upload(fullPath, {
        folder,
        resource_type: "auto",
      });
      changed = true;
      return {
        ...fileObj,
        url: res.secure_url,
        public_id: res.public_id,
      };
    } catch {
      return fileObj;
    }
  };

  if (col === "users" && doc.avatar?.public_id) {
    doc.avatar = await tryPromoteFile(doc.avatar, "matjari");
  } else if (col === "menuitems" && doc.image?.public_id) {
    doc.image = await tryPromoteFile(doc.image, "matjari");
  } else if (col === "settings" && doc.restaurant?.logo?.public_id) {
    doc.restaurant.logo = await tryPromoteFile(doc.restaurant.logo, "matjari");
  } else if (col === "expenses" && Array.isArray(doc.receipts)) {
    doc.receipts = await Promise.all(
      doc.receipts.map((r) => tryPromoteFile(r, "matjari/receipts"))
    );
  }

  if (changed && mongoose.connection.readyState === 1) {
    await mongoose.connection.db
      .collection(col)
      .updateOne({ _id: doc._id }, { $set: doc })
      .catch(() => {});
  }
  return doc;
}

/**
 * Push pending local mutations from Outbox to Cloud Atlas.
 */
async function pushLocalOutboxToCloud(remoteDb) {
  loadPersistedSyncState();
  if (outboxMap.size === 0) return 0;

  const localDb = mongoose.connection.db;
  const items = Array.from(outboxMap.values());
  let pushedCount = 0;

  // Group mutations by collection
  const byCol = new Map();
  for (const item of items) {
    if (!byCol.has(item.col)) byCol.set(item.col, []);
    byCol.get(item.col).push(item);
  }

  for (const [col, mutations] of byCol.entries()) {
    const localCol = localDb.collection(col);
    const remoteCol = remoteDb.collection(col);

    for (const mut of mutations) {
      try {
        const oid = mongoose.Types.ObjectId.isValid(mut.id)
          ? new mongoose.Types.ObjectId(mut.id)
          : mut.id;

        if (mut.op === "delete") {
          await remoteCol.deleteOne({ _id: oid });
          outboxMap.delete(`${col}:${mut.id}`);
          pushedCount++;
          continue;
        }

        let doc = await localCol.findOne({ _id: oid });
        if (!doc) {
          outboxMap.delete(`${col}:${mut.id}`);
          continue;
        }

        doc = await promoteLocalUploadsInDoc(col, doc);

        if (col === "counters" && doc.key) {
          await remoteCol.updateOne(
            { key: doc.key },
            { $max: { seq: doc.seq || 0 } },
            { upsert: true }
          );
        } else {
          const naturalKeys = NATURAL_UNIQUE_KEYS[col];
          if (naturalKeys) {
            const filter = Object.fromEntries(naturalKeys.map((k) => [k, doc[k]]));
            const existingRemote = await remoteCol.findOne(filter);
            if (existingRemote && String(existingRemote._id) !== String(doc._id)) {
              const { _id, ...rest } = doc;
              await remoteCol.updateOne({ _id: existingRemote._id }, { $set: rest });
            } else {
              await remoteCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
            }
          } else {
            await remoteCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
          }
        }

        outboxMap.delete(`${col}:${mut.id}`);
        pushedCount++;
      } catch (err) {
        // If duplicate key error on orderNumber or invoiceNumber, suffix and retry
        if (err?.code === 11000 && (col === "orders" || col === "invoices")) {
          try {
            const oid = new mongoose.Types.ObjectId(mut.id);
            const doc = await localCol.findOne({ _id: oid });
            if (doc) {
              const field = col === "orders" ? "orderNumber" : "invoiceNumber";
              doc[field] = `${doc[field]}-L${String(doc._id).slice(-3).toUpperCase()}`;
              await localCol.updateOne({ _id: oid }, { $set: { [field]: doc[field] } });
              await remoteCol.replaceOne({ _id: oid }, doc, { upsert: true });
              outboxMap.delete(`${col}:${mut.id}`);
              pushedCount++;
            }
          } catch {}
        } else {
          console.warn(`[CloudSync] Push error on ${col}:${mut.id}:`, err.message);
        }
      }
    }
  }

  savePersistedSyncState();
  return pushedCount;
}

/**
 * Pull updated/new records from Cloud Atlas into Local Embedded MongoDB.
 */
async function pullFromCloudToLocal(remoteDb) {
  const localDb = mongoose.connection.db;
  let pulledTotal = 0;
  let ordersChanged = false;
  let menuChanged = false;
  let inventoryChanged = false;

  suppressMutationCapture = true;
  try {
    await Promise.all(
      SYNC_COLLECTIONS.map(async (col) => {
        try {
          const remoteCol = remoteDb.collection(col);
          const localCol = localDb.collection(col);

          const lastSyncIso = syncState.collectionTimestamps[col];
          const localCount = await localCol.estimatedDocumentCount();

          let query = {};
          // Incremental pull if local collection already has data and we have a timestamp
          if (lastSyncIso && localCount > 0 && col !== "counters" && col !== "settings") {
            const sinceDate = new Date(new Date(lastSyncIso).getTime() - 5000);
            query = {
              $or: [
                { updatedAt: { $gt: sinceDate } },
                { createdAt: { $gt: sinceDate } },
              ],
            };
          }

          const remoteDocs = await remoteCol.find(query).limit(1000).toArray();
          if (!remoteDocs.length) {
            syncState.collectionTimestamps[col] = new Date().toISOString();
            return;
          }

          for (const rDoc of remoteDocs) {
            const idStr = String(rDoc._id);
            // Protect local unsynced changes from being overwritten
            if (outboxMap.has(`${col}:${idStr}`)) continue;

            if (col === "counters" && rDoc.key) {
              await localCol.updateOne(
                { key: rDoc.key },
                { $max: { seq: rDoc.seq || 0 } },
                { upsert: true }
              );
              continue;
            }

            const naturalKeys = NATURAL_UNIQUE_KEYS[col];
            if (naturalKeys) {
              const filter = Object.fromEntries(naturalKeys.map((k) => [k, rDoc[k]]));
              const existingLocal = await localCol.findOne(filter);
              if (existingLocal && String(existingLocal._id) !== idStr) {
                if (outboxMap.has(`${col}:${String(existingLocal._id)}`)) continue;
                await localCol.deleteOne({ _id: existingLocal._id });
              }
            }

            await localCol.replaceOne({ _id: rDoc._id }, rDoc, { upsert: true });
            pulledTotal++;

            if (col === "orders") ordersChanged = true;
            if (col === "menuitems" || col === "categories") menuChanged = true;
            if (col === "inventories" || col === "ingredients") inventoryChanged = true;
          }

          syncState.collectionTimestamps[col] = new Date().toISOString();
        } catch (err) {
          console.warn(`[CloudSync] Pull error on collection ${col}:`, err.message);
        }
      })
    );
  } finally {
    suppressMutationCapture = false;
  }

  savePersistedSyncState();

  // Notify connected local UI clients via Socket.io if remote updates arrived
  if (ordersChanged) emit(["kitchen", "orders", "dashboard"], "order:updated", { synced: true });
  if (menuChanged) emit(["orders", "dashboard"], "menu:updated", { synced: true });
  if (inventoryChanged) emit(["inventory", "dashboard"], "inventory:low", []);

  return pulledTotal;
}

/**
 * Execute one full bidirectional Cloud Sync cycle (Push Outbox -> Pull Incremental).
 */
export async function runCloudSyncCycle() {
  if (isSyncing) return getCloudSyncStatus();
  if (mongoose.connection.readyState !== 1) return getCloudSyncStatus();
  if (getDbMode() !== "local") return getCloudSyncStatus();

  isSyncing = true;
  syncState.syncing = true;

  try {
    const conn = await ensureCloudConnection();
    if (!conn || conn.readyState !== 1) {
      return getCloudSyncStatus();
    }

    const remoteDb = conn.db;
    const pushed = await pushLocalOutboxToCloud(remoteDb);
    const pulled = await pullFromCloudToLocal(remoteDb);

    syncState.lastPushCount = pushed;
    syncState.lastPullCount = pulled;
    syncState.lastSyncedAt = new Date().toISOString();
    syncState.lastError = null;
    savePersistedSyncState();

    if (pushed > 0 || pulled > 0) {
      console.log(`[CloudSync] Cycle complete — Pushed: ${pushed}, Pulled: ${pulled}`);
    }
  } catch (err) {
    syncState.lastError = err.message;
    syncState.cloudConnected = false;
  } finally {
    isSyncing = false;
    syncState.syncing = false;
  }

  return getCloudSyncStatus();
}

/**
 * Start the periodic background Cloud Sync Engine (runs immediately + every intervalMs).
 */
export function startCloudSyncEngine(intervalMs = 30000) {
  loadPersistedSyncState();
  if (syncTimer) clearInterval(syncTimer);

  // Initial sync 2 seconds after local server boots
  setTimeout(() => {
    runCloudSyncCycle().catch(() => {});
  }, 2000);

  syncTimer = setInterval(() => {
    runCloudSyncCycle().catch(() => {});
  }, intervalMs);

  console.log(`[CloudSync] Background Sync Engine started (interval: ${intervalMs / 1000}s)`);
}

export function stopCloudSyncEngine() {
  if (syncTimer) clearInterval(syncTimer);
  if (immediateTimer) clearTimeout(immediateTimer);
  if (cloudConn) cloudConn.close().catch(() => {});
}
