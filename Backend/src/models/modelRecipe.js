import mongoose from "mongoose";

const recipeItemSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    quantity: { type: Number, required: true, min: 0.001 }, 
  },
  { _id: false },
);

const recipeSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
      unique: true,
    },
    items: {
      type: [recipeItemSchema],
      validate: [
        (v) => v.length > 0,
        "Recipe must have at least one ingredient",
      ],
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

recipeSchema.index({ "items.ingredient": 1 });

export default mongoose.model("Recipe", recipeSchema);
