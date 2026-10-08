import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { objectId } from '../validators/commonValidators.js';
import * as ctrl from '../controllers/inventoryController.js';

const router = Router();
router.use(authenticate);

router.get(
  '/logs',
  authorize('Admin', 'Manager'),
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      productId: objectId.optional(),
    }),
  }),
  ctrl.listLogs
);

export default router;
