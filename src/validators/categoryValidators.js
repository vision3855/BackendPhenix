import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
});

export const updateCategorySchema = categorySchema.partial();
