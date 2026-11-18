import mongoose from "mongoose";

export const ORDER_TYPES = ["dine_in", "takeaway", "delivery"];
export const ORDER_STATUSES = [
  "new",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
];
export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"];

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, default: 0, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, trim: true, maxlength: 200 },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    orderType: { type: String, enum: ORDER_TYPES, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "new" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    paymentMethod: String,

    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, "Order must have items"],
    },

    tableNumber: String,
    customerName: String,
    customerPhone: String,
    deliveryAddress: String,
    notes: { type: String, trim: true, maxlength: 300 },

    subtotal: { type: Number, required: true },
    discount: {
      kind: { type: String, enum: ["percent", "fixed"] },
      value: Number,
      amount: { type: Number, default: 0 },
    },
    serviceCharge: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },
    tax: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },
    total: { type: Number, required: true },

   
    clientOperationId: { type: String, unique: true, sparse: true },
    origin: {
      type: String,
      enum: ["online", "offline_sync"],
      default: "online",
    },

    inventoryDeducted: { type: Boolean, default: false },
    cancelReason: String,
    paidAt: Date,
    preparingAt: Date,
    readyAt: Date,
    servedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    refundedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: 1 });
orderSchema.index({ paymentStatus: 1, paidAt: -1 });
orderSchema.index({ createdBy: 1, createdAt: -1 });
orderSchema.index({ orderType: 1 });

orderSchema.set("toJSON", {
  transform: (_d, r) => {
    delete r.__v;
    return r;
  },
});

export default mongoose.model("Order", orderSchema);
