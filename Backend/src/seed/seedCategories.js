import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Category from "../models/modelCategory.js";

const categories = [
  {
    name: "Burgers",
    description: "Delicious burgers and sandwiches",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Pizza",
    description: "Freshly baked pizzas",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Drinks",
    description: "Cold and refreshing drinks",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Desserts",
    description: "Sweet desserts and treats",
    sortOrder: 4,
    isActive: true,
  },
];

const seedCategories = async () => {
  try {
    await connectDB();

    for (const category of categories) {
      await Category.updateOne(
        { name: category.name },
        { $set: category },
        { upsert: true },
      );
    }

    console.log("Categories seeded successfully!");
    console.log(`Total categories: ${categories.length}`);
  } catch (error) {
    console.error("Category seed error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedCategories();