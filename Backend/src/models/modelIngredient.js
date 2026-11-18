import mongoose from "mongoose";

export const UNITS = ["g", "kg", "ml", "l", "piece"];

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      unique: true,
      maxlength: 100,
    },

    unit: {
      type: String,
      enum: UNITS,
      required: [true, "Unit is required"],
    },
    costPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Ingredient", ingredientSchema);
