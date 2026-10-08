import { InventoryLog } from '../models/InventoryLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, productId } = req.query;
  const filter = productId ? { product: productId } : {};

  const [logs, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate('product', 'name sku')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    InventoryLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});
