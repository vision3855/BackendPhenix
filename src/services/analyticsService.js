import mongoose from 'mongoose';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

/** Sales performance: revenue, items sold, number of sales in range. */
export async function salesPerformance({ startDate, endDate }) {
  const [result] = await Sale.aggregate([
    {
      $match: {
        soldAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalSales: { $sum: 1 },
        totalItemsSold: { $sum: { $sum: '$items.quantity' } },
      },
    },
    {
      $project: {
        _id: 0,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalSales: 1,
        totalItemsSold: 1,
      },
    },
  ]);
  return result ?? { totalRevenue: 0, totalSales: 0, totalItemsSold: 0 };
}

/**
 * Profit report: revenue, cost of goods sold (COGS) and gross profit for the
 * range, broken down by product.
 *
 * The cost basis prefers the `costPrice` snapshot stored on each sale line
 * (captured at sale time). For sales recorded before snapshots existed it
 * falls back to the product's current cost price, defaulting to 0 when the
 * product no longer exists.
 */
export async function profitReport({ startDate, endDate }) {
  const byProduct = await Sale.aggregate([
    { $match: { soldAt: { $gte: startDate, $lte: endDate } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        unitCost: {
          $ifNull: ['$items.costPrice', { $ifNull: ['$productDoc.costPrice', 0] }],
        },
      },
    },
    {
      $addFields: {
        lineRevenue: '$items.lineTotal',
        lineCost: { $multiply: ['$unitCost', '$items.quantity'] },
      },
    },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        sku: { $first: '$items.sku' },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: '$lineRevenue' },
        cost: { $sum: '$lineCost' },
        profit: { $sum: { $subtract: ['$lineRevenue', '$lineCost'] } },
      },
    },
    { $sort: { profit: -1 } },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        name: 1,
        sku: 1,
        quantitySold: 1,
        revenue: { $round: ['$revenue', 2] },
        cost: { $round: ['$cost', 2] },
        profit: { $round: ['$profit', 2] },
      },
    },
  ]);

  const products = byProduct.map((p) => ({
    ...p,
    profitMarginPct: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 10000) / 100 : 0,
  }));

  const totals = products.reduce(
    (acc, p) => {
      acc.totalRevenue += p.revenue;
      acc.totalCost += p.cost;
      acc.totalProfit += p.profit;
      acc.totalItemsSold += p.quantitySold;
      return acc;
    },
    { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalItemsSold: 0 }
  );

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    summary: {
      totalRevenue: round2(totals.totalRevenue),
      totalCost: round2(totals.totalCost),
      totalProfit: round2(totals.totalProfit),
      profitMarginPct:
        totals.totalRevenue > 0
          ? Math.round((totals.totalProfit / totals.totalRevenue) * 10000) / 100
          : 0,
      totalItemsSold: totals.totalItemsSold,
      productCount: products.length,
    },
    byProduct: products,
  };
}

/** Low-stock products: current stock <= lowStockThreshold (and not archived). */
export async function lowStockItems() {
  return Product.aggregate([
    { $match: { isArchived: false } },
    { $match: { $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] } } },
    {
      $project: {
        _id: 1, sku: 1, name: 1, stockQuantity: 1, lowStockThreshold: 1,
        sellingPrice: 1, severity: {
          $cond: [{ $eq: ['$stockQuantity', 0] }, 'OUT_OF_STOCK', 'LOW'],
        },
      },
    },
    { $sort: { stockQuantity: 1 } },
  ]);
}

/** Total inventory valuation at cost price. */
export async function inventoryValuation() {
  const [result] = await Product.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: null,
        totalCostValue: { $sum: { $multiply: ['$stockQuantity', '$costPrice'] } },
        totalRetailValue: { $sum: { $multiply: ['$stockQuantity', '$sellingPrice'] } },
        totalUnits: { $sum: '$stockQuantity' },
        productCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalCostValue: { $round: ['$totalCostValue', 2] },
        totalRetailValue: { $round: ['$totalRetailValue', 2] },
        totalUnits: 1,
        productCount: 1,
      },
    },
  ]);
  return result ?? { totalCostValue: 0, totalRetailValue: 0, totalUnits: 0, productCount: 0 };
}

/** Best-selling products by total quantity sold, in range. */
export async function topSellers({ startDate, endDate, limit = 10 }) {
  return Sale.aggregate([
    { $match: { soldAt: { $gte: startDate, $lte: endDate } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        sku: { $first: '$items.sku' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0, productId: '$_id', name: 1, sku: 1,
        totalQuantity: 1, totalRevenue: { $round: ['$totalRevenue', 2] },
      },
    },
  ]);
}

/** Sales distribution by category or by cashier. */
export async function salesBreakdown({ startDate, endDate, groupBy }) {
  const pipeline = [{ $match: { soldAt: { $gte: startDate, $lte: endDate } } }];

  if (groupBy === 'category') {
    pipeline.push(
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: '$productDoc' },
      { $addFields: { categoryId: '$productDoc.category' } }
    );
  }

  pipeline.push(
    {
      $group: {
        _id: groupBy === 'cashier' ? '$cashier' : '$categoryId',
        totalRevenue: { $sum: groupBy === 'cashier' ? '$totalAmount' : '$items.lineTotal' },
        totalSales: { $sum: groupBy === 'cashier' ? 1 : 0 },
        totalItemsSold: { $sum: groupBy === 'cashier' ? { $sum: '$items.quantity' } : '$items.quantity' },
      },
    },
    {
      $lookup: {
        from: groupBy === 'cashier' ? 'users' : 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'doc',
      },
    },
    { $unwind: '$doc' },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: groupBy === 'cashier' ? '$doc.name' : '$doc.name',
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalSales: 1,
        totalItemsSold: 1,
        share: null, // computed below via $setWindowFields alternative: use facet
      },
    },
    { $sort: { totalRevenue: -1 } }
  );

  const breakdown = await Sale.aggregate(pipeline);

  // Compute percentage share of total revenue
  const grandTotal = breakdown.reduce((acc, b) => acc + b.totalRevenue, 0);
  return breakdown.map((b) => ({
    ...b,
    revenueSharePct: grandTotal > 0 ? Math.round((b.totalRevenue / grandTotal) * 10000) / 100 : 0,
  }));
}

/** Daily revenue trend for a range — powers dashboard charts. */
export async function revenueTrend({ startDate, endDate }) {
  return Sale.aggregate([
    { $match: { soldAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } },
        revenue: { $sum: '$totalAmount' },
        sales: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: { $round: ['$revenue', 2] }, sales: 1 } },
  ]);
}
