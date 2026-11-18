import mongoose from "mongoose";
import userRole, { ROLE_VALUES } from "../utils/userRoles.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s]{7,20}$/, "Invalid phone number"],
    },
    avatar: {
      type: new mongoose.Schema(
        { url: String, public_id: String },
        { _id: false },
      ),
      default:null,
    },

   
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: userRole.CASHIER,
    },
    jobTitle: { type: String, trim: true, maxlength: 80 },
    hireDate: { type: Date, default: Date.now },
    salary: { type: Number, min: 0 }, 

  
    isActive: { type: Boolean, default: true },
    deactivatedAt: Date,
    lastLogin: Date,
    passwordChangedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ firstName: 1, lastName: 1 });

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    delete ret.id;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);
export default User;