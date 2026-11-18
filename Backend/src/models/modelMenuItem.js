import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },

    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    image: {
      type: new mongoose.Schema(
        { url: String, public_id: String },
        { _id: false },
      ),
      default: null,
    },
    isAvailable: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

menuItemSchema.index({ category: 1, isArchived: 1 });
menuItemSchema.index({ name: 1 });

menuItemSchema.virtual("profit").get(function () {
  if (this.cost == null) return undefined;
  return Math.round((this.price - this.cost) * 100) / 100;
});
menuItemSchema.virtual("margin").get(function () {
  if (this.cost == null || !this.price) return undefined;
  return Math.round(((this.price - this.cost) / this.price) * 10000) / 100;
});

menuItemSchema.set("toJSON", {
  virtuals: true,
  transform: (_d, r) => {
    delete r.id;
    delete r.__v;
    return r;
  },
});

export default mongoose.model("MenuItem", menuItemSchema);
