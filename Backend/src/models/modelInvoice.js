import mongoose from "mongoose";

const lineSchema = new mongoose.Schema(
  { name: String, price: Number, quantity: Number, total: Number },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    orderNumber: String,
    orderType: String,
    lines: [lineSchema],
    subtotal: Number,
    discount: { kind: String, value: Number, amount: Number },
    serviceCharge: { rate: Number, amount: Number },
    tax: { rate: Number, amount: Number },
    total: Number,
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    paymentMethod: String,
    currency: String,
    restaurant: {
      name: String,
      phone: String,
      address: String,
      taxNumber: String,
    },
    footerNote: String,
    status: { type: String, enum: ["issued", "refunded"], default: "issued" },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

invoiceSchema.index({ createdAt: -1 });

export default mongoose.model("Invoice", invoiceSchema);
