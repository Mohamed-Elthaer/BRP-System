import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: [true, "Amount is required"], min: 0.01 },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    date: { type: Date, default: Date.now },
    receipts: [
      new mongoose.Schema(
        { url: String, public_id: String, resourceType: String },
        { _id: false },
      ),
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export default mongoose.model("Expense", expenseSchema);
