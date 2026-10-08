import { z } from 'zod';
import { objectId } from './commonValidators.js';

export const createProductSchema = z.object({
  sku: z.string().trim().min(2).max(50),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  category: objectId,
  costPrice: z.coerce.number().positive('Cost price must be > 0'),
  sellingPrice: z.coerce.number().positive('Selling price must be > 0'),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
});

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });

export const listProductsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  category: objectId.optional(),
  lowStock: z.coerce.boolean().optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
  sort: z.enum(['name', 'stockQuantity', 'sellingPrice', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const adjustStockSchema = z.object({
  quantityChange: z.coerce.number().int().refine((v) => v !== 0, 'Must be non-zero'),
  type: z.enum(['RESTOCK', 'ADJUSTMENT', 'RETURN']),
  note: z.string().trim().max(500).optional(),
});
