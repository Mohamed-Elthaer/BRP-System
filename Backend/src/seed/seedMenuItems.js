import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Category from "../models/modelCategory.js";
import MenuItem from "../models/modelMenuItem.js";

const menuItems = [
  // Burgers (5)
  {
    name: "Classic Burger",
    description: "Beef patty with lettuce, tomato and cheese",
    categoryName: "Burgers",
    price: 150,
    cost: 85,
    sortOrder: 1,
  },
  {
    name: "Double Cheeseburger",
    description: "Double beef patty with extra cheese",
    categoryName: "Burgers",
    price: 220,
    cost: 125,
    sortOrder: 2,
  },
  {
    name: "Chicken Burger",
    description: "Crispy chicken with special sauce",
    categoryName: "Burgers",
    price: 140,
    cost: 75,
    sortOrder: 3,
  },
  {
    name: "BBQ Burger",
    description: "Beef burger with BBQ sauce and onions",
    categoryName: "Burgers",
    price: 180,
    cost: 100,
    sortOrder: 4,
  },
  {
    name: "Mushroom Burger",
    description: "Beef burger with mushrooms and cheese",
    categoryName: "Burgers",
    price: 190,
    cost: 110,
    sortOrder: 5,
  },

  // Pizza (5)
  {
    name: "Margherita Pizza",
    description: "Tomato sauce, mozzarella and basil",
    categoryName: "Pizza",
    price: 180,
    cost: 95,
    sortOrder: 1,
  },
  {
    name: "Pepperoni Pizza",
    description: "Mozzarella cheese and pepperoni",
    categoryName: "Pizza",
    price: 240,
    cost: 135,
    sortOrder: 2,
  },
  {
    name: "Chicken Ranch Pizza",
    description: "Chicken, ranch sauce and mozzarella",
    categoryName: "Pizza",
    price: 250,
    cost: 140,
    sortOrder: 3,
  },
  {
    name: "Vegetable Pizza",
    description: "Fresh vegetables and mozzarella",
    categoryName: "Pizza",
    price: 200,
    cost: 105,
    sortOrder: 4,
  },
  {
    name: "BBQ Chicken Pizza",
    description: "Chicken, BBQ sauce and onions",
    categoryName: "Pizza",
    price: 260,
    cost: 145,
    sortOrder: 5,
  },

  // Drinks (5)
  {
    name: "Cola",
    description: "Cold cola drink",
    categoryName: "Drinks",
    price: 35,
    cost: 18,
    sortOrder: 1,
  },
  {
    name: "Orange Juice",
    description: "Fresh orange juice",
    categoryName: "Drinks",
    price: 55,
    cost: 25,
    sortOrder: 2,
  },
  {
    name: "Lemon Mint",
    description: "Fresh lemon with mint",
    categoryName: "Drinks",
    price: 50,
    cost: 22,
    sortOrder: 3,
  },
  {
    name: "Iced Coffee",
    description: "Chilled coffee with milk",
    categoryName: "Drinks",
    price: 75,
    cost: 35,
    sortOrder: 4,
  },
  {
    name: "Water",
    description: "Bottled mineral water",
    categoryName: "Drinks",
    price: 15,
    cost: 7,
    sortOrder: 5,
  },

  // Desserts (5)
  {
    name: "Chocolate Cake",
    description: "Rich chocolate cake",
    categoryName: "Desserts",
    price: 90,
    cost: 40,
    sortOrder: 1,
  },
  {
    name: "Cheesecake",
    description: "Creamy classic cheesecake",
    categoryName: "Desserts",
    price: 110,
    cost: 50,
    sortOrder: 2,
  },
  {
    name: "Brownie",
    description: "Chocolate brownie",
    categoryName: "Desserts",
    price: 70,
    cost: 30,
    sortOrder: 3,
  },
  {
    name: "Ice Cream",
    description: "Vanilla ice cream",
    categoryName: "Desserts",
    price: 60,
    cost: 25,
    sortOrder: 4,
  },
  {
    name: "Molten Cake",
    description: "Warm chocolate cake with a molten center",
    categoryName: "Desserts",
    price: 120,
    cost: 55,
    sortOrder: 5,
  },
];

const seedMenuItems = async () => {
  try {
    await connectDB();

    const categories = await Category.find({
      name: { $in: ["Burgers", "Pizza", "Drinks", "Desserts"] },
    });

    const categoryMap = new Map(
      categories.map((category) => [category.name, category._id]),
    );

    if (categoryMap.size !== 4) {
      throw new Error(
        "Some categories are missing. Run seedCategories.js first.",
      );
    }

    const operations = menuItems.map((item) => {
      const { categoryName, ...data } = item;

      return {
        updateOne: {
          filter: {
            name: data.name,
            category: categoryMap.get(categoryName),
          },
          update: {
            $set: {
              ...data,
              category: categoryMap.get(categoryName),
              isAvailable: true,
              isArchived: false,
            },
          },
          upsert: true,
        },
      };
    });

    await MenuItem.bulkWrite(operations);

    console.log("Menu items seeded successfully!");
    console.log(`Total menu items: ${menuItems.length}`);
  } catch (error) {
    console.error("Menu item seed error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedMenuItems();