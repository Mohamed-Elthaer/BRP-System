
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Ingredient from "../models/modelIngredient.js";

const ingredients = [
    { name: "Eggs", unit: "piece", costPerUnit: 6, minStock: 30 },
  // Meat & Chicken
  { name: "Beef", unit: "g", costPerUnit: 0.45, minStock: 5000 },
  { name: "Chicken Breast", unit: "g", costPerUnit: 0.25, minStock: 4000 },
  { name: "Chicken Fillet", unit: "g", costPerUnit: 0.28, minStock: 3000 },

  // Bakery
  { name: "Burger Bun", unit: "piece", costPerUnit: 8, minStock: 30 },
  { name: "Pizza Dough", unit: "g", costPerUnit: 0.08, minStock: 5000 },
  { name: "Brownie Base", unit: "g", costPerUnit: 0.12, minStock: 1000 },

  // Dairy
  { name: "Mozzarella Cheese", unit: "g", costPerUnit: 0.35, minStock: 2000 },
  { name: "Cheddar Cheese", unit: "g", costPerUnit: 0.4, minStock: 1000 },
  { name: "Milk", unit: "ml", costPerUnit: 0.06, minStock: 3000 },
  { name: "Cream Cheese", unit: "g", costPerUnit: 0.3, minStock: 1000 },
  { name: "Butter", unit: "g", costPerUnit: 0.25, minStock: 1000 },
  { name: "Ice Cream Mix", unit: "ml", costPerUnit: 0.12, minStock: 2000 },

  // Vegetables
  { name: "Tomato", unit: "g", costPerUnit: 0.04, minStock: 2000 },
  { name: "Lettuce", unit: "g", costPerUnit: 0.08, minStock: 1000 },
  { name: "Onion", unit: "g", costPerUnit: 0.03, minStock: 1500 },
  { name: "Mushroom", unit: "g", costPerUnit: 0.2, minStock: 1000 },
  { name: "Bell Pepper", unit: "g", costPerUnit: 0.1, minStock: 1000 },
  { name: "Olives", unit: "g", costPerUnit: 0.15, minStock: 500 },
  { name: "Basil", unit: "g", costPerUnit: 0.2, minStock: 300 },

  // Sauces & Extras
  { name: "Tomato Sauce", unit: "g", costPerUnit: 0.08, minStock: 2000 },
  { name: "BBQ Sauce", unit: "ml", costPerUnit: 0.12, minStock: 1000 },
  { name: "Ranch Sauce", unit: "ml", costPerUnit: 0.15, minStock: 500 },
  { name: "Mayonnaise", unit: "g", costPerUnit: 0.1, minStock: 1000 },
  { name: "Sugar", unit: "g", costPerUnit: 0.04, minStock: 2000 },
  { name: "Coffee", unit: "g", costPerUnit: 0.5, minStock: 500 },
  { name: "Cocoa Powder", unit: "g", costPerUnit: 0.3, minStock: 500 },
  { name: "Chocolate", unit: "g", costPerUnit: 0.35, minStock: 1000 },
  { name: "Vanilla", unit: "ml", costPerUnit: 0.2, minStock: 200 },
  { name: "Lemon", unit: "piece", costPerUnit: 5, minStock: 20 },
  { name: "Mint", unit: "g", costPerUnit: 0.1, minStock: 300 },
  { name: "Orange", unit: "piece", costPerUnit: 8, minStock: 30 },

  // Drinks
  { name: "Cola Syrup", unit: "ml", costPerUnit: 0.08, minStock: 2000 },
  { name: "Water", unit: "ml", costPerUnit: 0.005, minStock: 10000 },
];

const seedIngredients = async () => {
  try {
    await connectDB();

    const operations = ingredients.map((ingredient) => ({
      updateOne: {
        filter: { name: ingredient.name },
        update: { $set: ingredient },
        upsert: true,
      },
    }));

    await Ingredient.bulkWrite(operations);

    console.log("Ingredients seeded successfully!");
    console.log(`Total ingredients: ${ingredients.length}`);
  } catch (error) {
    console.error("Ingredient seed error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedIngredients();
