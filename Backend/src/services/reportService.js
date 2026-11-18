import Order from "../models/modelOrder.js";
import Expense from "../models/modelExpense.js";
import Inventory from "../models/modelInventory.js";
import Ingredient from "../models/modelIngredient.js";
import SyncOperation from "../models/modelSyncOperation.js";
import { round2 } from "../utils/money.js";

const paidMatch = (from, to) => ({
  paymentStatus: "paid",
  paidAt: { $gte: from, $lte: to },
});

const cogsExpr = {
  $sum: {
    $map: {
      input: "$items",
      as: "i",
      in: { $multiply: ["$$i.cost", "$$i.quantity"] },
    },
  },
};

const periodMetrics = async (from, to) => {
  const [sales, counts, expenses] = await Promise.all([
    Order.aggregate([
      { $match: paidMatch(from, to) },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          paidOrders: { $sum: 1 },
          cogs: { $sum: cogsExpr },
        },
      },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const s = sales[0] || { revenue: 0, paidOrders: 0, cogs: 0 };
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  const totalOrders = counts.reduce(
    (a, c) => a + (c._id === "cancelled" ? 0 : c.count),
    0,
  );
  const totalExpenses = expenses[0]?.total || 0;

  return {
    revenue: round2(s.revenue),
    paidOrders: s.paidOrders,
    totalOrders,
    cancelledOrders: byStatus.cancelled || 0,
    avgOrderValue: s.paidOrders ? round2(s.revenue / s.paidOrders) : 0,
    cogs: round2(s.cogs),
    grossProfit: round2(s.revenue - s.cogs),
    expenses: round2(totalExpenses),
    netProfit: round2(s.revenue - s.cogs - totalExpenses),
  };
};

const pctChange = (cur, prev) =>
  prev ? round2(((cur - prev) / Math.abs(prev)) * 100) : null;

export const getLowStock = async () => {
  const [ingredients, balances] = await Promise.all([
    Ingredient.find({ isActive: true }),
    Inventory.find(),
  ]);
  const bal = new Map(balances.map((b) => [String(b.ingredient), b.quantity]));
  return ingredients
    .map((i) => ({
      _id: i._id,
      name: i.name,
      unit: i.unit,
      minStock: i.minStock,
      quantity: bal.get(String(i._id)) ?? 0,
    }))
    .filter((i) => i.quantity <= i.minStock);
};

export const getOverview = async ({ from, to, timezone }) => {
  const span = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - span);
  const prevTo = new Date(from.getTime() - 1);

  const [
    current,
    previous,
    ongoing,
    salesTrend,
    expenseTrend,
    topMeals,
    bottomMeals,
    employees,
    lowStock,
    syncIssues,
  ] = await Promise.all([
    periodMetrics(from, to),
    periodMetrics(prevFrom, prevTo),
    Order.aggregate([
      { $match: { status: { $in: ["new", "preparing", "ready", "served"] } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: paidMatch(from, to) },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date", timezone },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    mealRanking(from, to, -1),
    mealRanking(from, to, 1),
    Order.aggregate([
      { $match: paidMatch(from, to) },
      {
        $group: {
          _id: "$createdBy",
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "u",
        },
      },
      {
        $project: {
          orders: 1,
          revenue: { $round: ["$revenue", 2] },
          name: {
            $concat: [
              { $arrayElemAt: ["$u.firstName", 0] },
              " ",
              { $arrayElemAt: ["$u.lastName", 0] },
            ],
          },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    getLowStock(),
    SyncOperation.countDocuments({ status: { $in: ["failed", "conflict"] } }),
  ]);

  const change = Object.fromEntries(
    Object.keys(current).map((k) => [k, pctChange(current[k], previous[k])]),
  );

  const notifications = [];
  if (lowStock.length)
    notifications.push({ type: "low_stock", count: lowStock.length });
  if (syncIssues)
    notifications.push({ type: "sync_issues", count: syncIssues });

  return {
    period: { from, to },
    current,
    previous,
    change,
    ongoingOrders: Object.fromEntries(ongoing.map((o) => [o._id, o.count])),
    salesTrend: salesTrend.map((d) => ({
      date: d._id,
      revenue: round2(d.revenue),
      orders: d.orders,
    })),
    expenseTrend: expenseTrend.map((d) => ({
      date: d._id,
      total: round2(d.total),
    })),
    topMeals,
    bottomMeals,
    employees,
    lowStock,
    notifications,
  };
};

const mealRanking = (from, to, dir) =>
  Order.aggregate([
    { $match: paidMatch(from, to) },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.menuItem",
        name: { $first: "$items.name" },
        quantity: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { quantity: dir } },
    { $limit: 5 },
    {
      $project: { name: 1, quantity: 1, revenue: { $round: ["$revenue", 2] } },
    },
  ]);
