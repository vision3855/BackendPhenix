import { Product } from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as productService from '../services/productService.js';

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: { product } });
});

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, search, category, lowStock, includeArchived, sort, order } = req.query;

  const filter = {};
  if (!includeArchived) filter.isArchived = false;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ];
  }
  if (lowStock) filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name');
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: { product } });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('category', 'name');
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: { product } });
});

export const archiveProduct = asyncHandler(async (req, res) => {
  const product = await productService.archiveProduct(req.params.id, req.user.id);
  res.json({ success: true, data: { product } });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const product = await productService.adjustStock({
    productId: req.params.id,
    quantityChange: req.body.quantityChange,
    type: req.body.type,
    note: req.body.note,
    userId: req.user.id,
  });
  res.json({ success: true, data: { product } });
});
