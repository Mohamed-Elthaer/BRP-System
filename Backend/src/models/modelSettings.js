import mongoose from "mongoose";
import { ORDER_TYPES } from "./modelOrder.js";

const orderTypeSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ORDER_TYPES, required: true },
    label: String,
    enabled: { type: Boolean, default: true },

    requiredFields: { type: [String], default: [] },
  },
  { _id: false },
);

const paymentMethodSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: String,
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    restaurant: {
      name: { type: String, default: "My Restaurant" },
      phone: String,
      address: String,
      taxNumber: String,
      logo: { url: String, public_id: String },
    },
    currency: { type: String, default: "EGP" },
    timezone: { type: String, default: "Africa/Cairo" },
    tax: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 14, min: 0, max: 100 },
    },
    serviceCharge: {
      enabled: { type: Boolean, default: false },
      rate: { type: Number, default: 12, min: 0, max: 100 },
      appliesTo: { type: [String], default: ["dine_in"] },
    },
    defaultDiscount: {
      enabled: { type: Boolean, default: false },
      mode: { type: String, enum: ["percent", "fixed"], default: "percent" },
      value: { type: Number, default: 0, min: 0 },
    },
    maxCashierDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
    orderTypes: {
      type: [orderTypeSchema],
      default: [
        { key: "dine_in", label: "Dine-in", requiredFields: ["tableNumber"] },
        { key: "takeaway", label: "Takeaway", requiredFields: [] },
        {
          key: "delivery",
          label: "Delivery",
          requiredFields: ["customerName", "customerPhone", "deliveryAddress"],
        },
      ],
    },
    paymentMethods: {
      type: [paymentMethodSchema],
      default: [
        { key: "cash", label: "Cash" },
        { key: "card", label: "Card" },
        { key: "wallet", label: "Mobile wallet" },
      ],
    },
    expenseCategories: {
      type: [String],
      default: [
        "rent",
        "salaries",
        "utilities",
        "maintenance",
        "supplies",
        "other",
      ],
    },
    invoice: {
      prefix: { type: String, default: "INV" },
      footerNote: { type: String, default: "Thank you for your visit" },
      showTaxNumber: { type: Boolean, default: true },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Settings", settingsSchema);
