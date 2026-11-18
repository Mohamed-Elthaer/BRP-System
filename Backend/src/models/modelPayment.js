import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, required: true },
    amountTendered: Number,
    change: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["completed", "refunded"],
      default: "completed",
    },
    operationId: { type: String, unique: true, sparse: true }, // idempotency
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paidAt: { type: Date, default: Date.now },
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    refundReason: String,
  },
  { timestamps: true },
);

paymentSchema.index(
  { order: 1 },
  { unique: true, partialFilterExpression: { status: "completed" } },
);
paymentSchema.index({ paidAt: -1 });

export default mongoose.model("Payment", paymentSchema);
