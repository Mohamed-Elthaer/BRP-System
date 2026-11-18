import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userRole: String,
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

logSchema.index({ createdAt: -1 });
logSchema.index({ user: 1, createdAt: -1 });
logSchema.index({ action: 1, createdAt: -1 });
logSchema.index({ entity: 1, entityId: 1 });

const blocked = function (next) {
  next(new Error("Activity logs are append-only"));
};
logSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ],
  blocked,
);
logSchema.pre("save", function (next) {
  if (!this.isNew) {
    throw next(new Error("Activity logs are append-only"));
  }
    
  
});

export default mongoose.model("ActivityLog", logSchema);
