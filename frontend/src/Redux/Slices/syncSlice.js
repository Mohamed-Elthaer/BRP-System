import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { errMsg, makeThunk } from "../helpers.js";
import * as syncApi from "../../Api/syncApi.js";
import { kvGet, kvSet } from "../../Utils/offlineDb.js";

// الطابور المحلي في IndexedDB: بيفضل موجود بعد refresh أو قفل المتصفح
export const loadQueue = createAsyncThunk("sync/loadQueue", async () => (await kvGet("queue")) || []);

export const enqueueOperation = createAsyncThunk("sync/enqueue", async (op, { getState }) => {
  const queue = [...getState().sync.queue, op];
  await kvSet("queue", queue);
  return queue;
});

// أي عملية السيرفر رد عليها (نجحت/فشلت/تعارض) بتتشال من الطابور المحلي لأن السيرفر سجّلها
export const pushQueue = createAsyncThunk(
  "sync/push",
  async (_, { getState, rejectWithValue }) => {
    const queue = getState().sync.queue;
    if (!queue.length) return { results: [], remaining: [] };
    try {
      const batch = queue.slice(0, 50).map(({ operationId, type, payload, clientCreatedAt }) => ({ operationId, type, payload, clientCreatedAt }));
      const { results } = await syncApi.pushOperations(batch);
      const handled = new Set(results.filter((r) => r.status && r.status !== "pending").map((r) => r.operationId));
      const remaining = queue.filter((op) => !handled.has(op.operationId));
      await kvSet("queue", remaining);
      return { results, remaining };
    } catch (e) {
      return rejectWithValue(errMsg(e, "Sync failed"));
    }
  },
  { condition: (_, { getState }) => !getState().sync.syncing },
);

export const fetchSyncStatus = makeThunk("sync/status", syncApi.getSyncStatus, "Failed to load sync status");
export const retrySyncOp = makeThunk("sync/retry", syncApi.retryOperation, "Retry failed");
export const dismissSyncOp = makeThunk("sync/dismiss", ({ operationId, note }) => syncApi.dismissOperation(operationId, note), "Failed to dismiss operation");

const syncSlice = createSlice({
  name: "sync",
  initialState: {
    queue: [], loaded: false, syncing: false, lastResults: [],
    counts: { pending: 0, done: 0, failed: 0, conflict: 0, dismissed: 0 }, attention: [], loading: false, error: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadQueue.fulfilled, (s, a) => { s.queue = a.payload; s.loaded = true; })
      .addCase(enqueueOperation.fulfilled, (s, a) => { s.queue = a.payload; })
      .addCase(pushQueue.pending, (s) => { s.syncing = true; })
      .addCase(pushQueue.fulfilled, (s, a) => { s.syncing = false; s.queue = a.payload.remaining; s.lastResults = a.payload.results; })
      .addCase(pushQueue.rejected, (s, a) => { s.syncing = false; if (a.payload) s.error = a.payload; })
      .addCase(fetchSyncStatus.pending, (s) => { s.loading = true; })
      .addCase(fetchSyncStatus.fulfilled, (s, a) => { s.loading = false; s.counts = a.payload.counts; s.attention = a.payload.attention; })
      .addCase(fetchSyncStatus.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default syncSlice.reducer;
