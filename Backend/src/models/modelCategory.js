import mongoose from "mongoose";


const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
      maxlength: 60,
    },
    description: { type: String, trim: true, maxlength: 200 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Category=mongoose.model("Category", categorySchema);
export default Category
