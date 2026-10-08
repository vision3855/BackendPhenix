import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const dateRangeQuery = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const idParam = z.object({ id: objectId });
