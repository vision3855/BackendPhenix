import { z } from 'zod';
import { objectId } from './commonValidators.js';

export const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z.coerce.number().int().min(1).max(100000),
      })
    )
    .min(1, 'At least one item is required')
    .max(200),
  paymentMethod: z.enum(['cash', 'card', 'mobile_money', 'other']).default('cash'),
});

export const listSalesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  cashierId: objectId.optional(),
});
