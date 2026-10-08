import { asyncHandler } from '../utils/asyncHandler.js';
import * as analytics from '../services/analyticsService.js';

const DAY = 24 * 60 * 60 * 1000;

function resolveRange(query) {
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(endDate.getTime() - 30 * DAY);
  return { startDate, endDate };
}

export const salesPerformance = asyncHandler(async (req, res) => {
  const data = await analytics.salesPerformance(resolveRange(req.query));
  res.json({ success: true, data });
});

export const lowStock = asyncHandler(async (_req, res) => {
  const items = await analytics.lowStockItems();
  res.json({ success: true, data: { count: items.length, items } });
});

export const inventoryValuation = asyncHandler(async (_req, res) => {
  const data = await analytics.inventoryValuation();
  res.json({ success: true, data });
});

export const topSellers = asyncHandler(async (req, res) => {
  const data = await analytics.topSellers({ ...resolveRange(req.query), limit: req.query.limit ?? 10 });
  res.json({ success: true, data: { topSellers: data } });
});

export const salesBreakdown = asyncHandler(async (req, res) => {
  const groupBy = req.query.groupBy === 'cashier' ? 'cashier' : 'category';
  const data = await analytics.salesBreakdown({ ...resolveRange(req.query), groupBy });
  res.json({ success: true, data: { groupBy, breakdown: data } });
});

export const revenueTrend = asyncHandler(async (req, res) => {
  const data = await analytics.revenueTrend(resolveRange(req.query));
  res.json({ success: true, data: { trend: data } });
});

export const dashboard = asyncHandler(async (req, res) => {
  const range = resolveRange(req.query);
  const [performance, lowStockItems, valuation, top, trend] = await Promise.all([
    analytics.salesPerformance(range),
    analytics.lowStockItems(),
    analytics.inventoryValuation(),
    analytics.topSellers({ ...range, limit: 5 }),
    analytics.revenueTrend(range),
  ]);
  res.json({
    success: true,
    data: { performance, lowStock: { count: lowStockItems.length, items: lowStockItems }, valuation, topSellers: top, trend },
  });
});
