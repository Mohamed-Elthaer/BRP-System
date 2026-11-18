import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
      unique: true,
    },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("Inventory", inventorySchema);
