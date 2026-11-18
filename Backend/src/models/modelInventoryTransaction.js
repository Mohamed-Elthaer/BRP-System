import mongoose from "mongoose";

export const TX_TYPES = [
  "purchase",
  "consumption",
  "waste",
  "adjustment",
  "return",
];

const txSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    type: { type: String, enum: TX_TYPES, required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    unitCost: Number,
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    reason: { type: String, trim: true },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

txSchema.index({ ingredient: 1, createdAt: -1 });
txSchema.index({ type: 1, createdAt: -1 });
txSchema.index({ order: 1 });

export default mongoose.model("InventoryTransaction", txSchema);
