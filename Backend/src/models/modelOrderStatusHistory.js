import mongoose from "mongoose";
import { ORDER_STATUSES } from "./modelOrder.js";

const historySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    from: { type: String, enum: [...ORDER_STATUSES, null], default: null },
    to: { type: String, enum: ORDER_STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

historySchema.index({ order: 1, createdAt: 1 });

export default mongoose.model("OrderStatusHistory", historySchema);
