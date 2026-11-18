
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Ingredient from "../models/modelIngredient.js";
import MenuItem from "../models/modelMenuItem.js";
import Recipe from "../models/modelRecipe.js";

const recipes = [
  // BURGERS
  {
    menuItemName: "Classic Burger",
    items: [
      ["Beef", 150],
      ["Burger Bun", 1],
      ["Lettuce", 20],
      ["Tomato", 30],
      ["Cheddar Cheese", 20],
      ["Mayonnaise", 15],
    ],
  },
  {
    menuItemName: "Double Cheeseburger",
    items: [
      ["Beef", 300],
      ["Burger Bun", 1],
      ["Cheddar Cheese", 40],
      ["Lettuce", 20],
      ["Tomato", 30],
    ],
  },
  {
    menuItemName: "Chicken Burger",
    items: [
      ["Chicken Fillet", 150],
      ["Burger Bun", 1],
      ["Lettuce", 20],
      ["Mayonnaise", 20],
    ],
  },
  {
    menuItemName: "BBQ Burger",
    items: [
      ["Beef", 150],
      ["Burger Bun", 1],
      ["BBQ Sauce", 25],
      ["Onion", 20],
      ["Cheddar Cheese", 20],
    ],
  },
  {
    menuItemName: "Mushroom Burger",
    items: [
      ["Beef", 150],
      ["Burger Bun", 1],
      ["Mushroom", 40],
      ["Cheddar Cheese", 30],
    ],
  },

  // PIZZA
  {
    menuItemName: "Margherita Pizza",
    items: [
      ["Pizza Dough", 250],
      ["Tomato Sauce", 60],
      ["Mozzarella Cheese", 100],
      ["Basil", 5],
    ],
  },
  {
    menuItemName: "Pepperoni Pizza",
    items: [
      ["Pizza Dough", 250],
      ["Tomato Sauce", 60],
      ["Mozzarella Cheese", 100],
      ["Tomato", 30],
    ],
  },
  {
    menuItemName: "Chicken Ranch Pizza",
    items: [
      ["Pizza Dough", 250],
      ["Chicken Breast", 120],
      ["Ranch Sauce", 40],
      ["Mozzarella Cheese", 100],
    ],
  },
  {
    menuItemName: "Vegetable Pizza",
    items: [
      ["Pizza Dough", 250],
      ["Tomato Sauce", 60],
      ["Mozzarella Cheese", 80],
      ["Bell Pepper", 40],
      ["Olives", 20],
      ["Onion", 20],
    ],
  },
  {
    menuItemName: "BBQ Chicken Pizza",
    items: [
      ["Pizza Dough", 250],
      ["Chicken Breast", 120],
      ["BBQ Sauce", 40],
      ["Mozzarella Cheese", 100],
      ["Onion", 20],
    ],
  },

  // DRINKS
  {
    menuItemName: "Cola",
    items: [
      ["Cola Syrup", 30],
      ["Water", 250],
    ],
  },
  {
    menuItemName: "Orange Juice",
    items: [
      ["Orange", 3],
      ["Sugar", 10],
      ["Water", 100],
    ],
  },
  {
    menuItemName: "Lemon Mint",
    items: [
      ["Lemon", 2],
      ["Mint", 10],
      ["Sugar", 20],
      ["Water", 200],
    ],
  },
  {
    menuItemName: "Iced Coffee",
    items: [
      ["Coffee", 20],
      ["Milk", 150],
      ["Sugar", 15],
      ["Vanilla", 5],
    ],
  },
  {
    menuItemName: "Water",
    items: [
      ["Water", 500],
    ],
  },

  // DESSERTS
  {
    menuItemName: "Chocolate Cake",
    items: [
      ["Chocolate", 50],
      ["Cocoa Powder", 20],
      ["Milk", 50],
      ["Sugar", 40],
      ["Butter", 20],
    ],
  },
  {
    menuItemName: "Cheesecake",
    items: [
      ["Cream Cheese", 100],
      ["Butter", 20],
      ["Sugar", 30],
      ["Milk", 30],
    ],
  },
  {
    menuItemName: "Brownie",
    items: [
      ["Brownie Base", 100],
      ["Chocolate", 30],
      ["Butter", 25],
      ["Sugar", 30],
    ],
  },
  {
    menuItemName: "Ice Cream",
    items: [
      ["Ice Cream Mix", 150],
      ["Milk", 30],
      ["Vanilla", 5],
      ["Sugar", 15],
    ],
  },
  {
    menuItemName: "Molten Cake",
    items: [
      ["Chocolate", 60],
      ["Butter", 30],
      ["Sugar", 35],
      ["Cocoa Powder", 15],
      ["Eggs", 1],
    ],
  },
];

const seedRecipes = async () => {
  try {
    await connectDB();

    const [menuItems, ingredients] = await Promise.all([
      MenuItem.find({ isArchived: false }),
      Ingredient.find({ isActive: true }),
    ]);

    const menuMap = new Map(menuItems.map((m) => [m.name, m._id]));
    const ingredientMap = new Map(
      ingredients.map((i) => [i.name, i._id]),
    );

    const missingMenuItems = recipes.filter(
      (r) => !menuMap.has(r.menuItemName),
    );

    if (missingMenuItems.length) {
      throw new Error(
        `Missing menu items: ${missingMenuItems.map((r) => r.menuItemName).join(", ")}`,
      );
    }

    const missingIngredients = [
      ...new Set(
        recipes.flatMap((r) =>
          r.items
            .filter(([name]) => !ingredientMap.has(name))
            .map(([name]) => name),
        ),
      ),
    ];

    if (missingIngredients.length) {
      throw new Error(
        `Missing ingredients: ${missingIngredients.join(", ")}`,
      );
    }

    const operations = recipes.map((recipe) => ({
      updateOne: {
        filter: { menuItem: menuMap.get(recipe.menuItemName) },
        update: {
          $set: {
            menuItem: menuMap.get(recipe.menuItemName),
            items: recipe.items.map(([name, quantity]) => ({
              ingredient: ingredientMap.get(name),
              quantity,
            })),
            notes: `Recipe for ${recipe.menuItemName}`,
          },
        },
        upsert: true,
      },
    }));

    await Recipe.bulkWrite(operations);

    console.log("Recipes seeded successfully!");
    console.log(`Total recipes: ${recipes.length}`);
  } catch (error) {
    console.error("Recipe seed error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedRecipes();
