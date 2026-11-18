import mongoose from "mongoose";

export const SYNC_STATUSES = [
  "pending",
  "done",
  "failed",
  "conflict",
  "dismissed",
];

const syncSchema = new mongoose.Schema(
  {
    operationId: { type: String, required: true, unique: true },
    type: { type: String, required: true }, 
    payload: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: SYNC_STATUSES, default: "pending" },
    result: mongoose.Schema.Types.Mixed,
    error: String,
    attempts: { type: Number, default: 0 },
    clientCreatedAt: Date,
    processedAt: Date,

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolutionNote: String,
  },
  { timestamps: true },
);

syncSchema.index({ status: 1, createdAt: -1 });
syncSchema.index({ user: 1, status: 1 });

export default mongoose.model("SyncOperation", syncSchema);
