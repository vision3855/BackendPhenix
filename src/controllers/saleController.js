import { Sale } from '../models/Sale.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as saleService from '../services/saleService.js';

export const createSale = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale({
    items: req.body.items,
    cashierId: req.user.id,
    paymentMethod: req.body.paymentMethod,
  });
  res.status(201).json({ success: true, data: { sale } });
});

export const listSales = asyncHandler(async (req, res) => {
  const { page, limit, startDate, endDate, cashierId } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.soldAt = {};
    if (startDate) filter.soldAt.$gte = startDate;
    if (endDate) filter.soldAt.$lte = endDate;
  }
  if (cashierId) filter.cashier = cashierId;

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate('cashier', 'name email role')
      .sort({ soldAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Sale.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { sales, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('cashier', 'name email role');
  if (!sale) throw ApiError.notFound('Sale not found');
  res.json({ success: true, data: { sale } });
});
