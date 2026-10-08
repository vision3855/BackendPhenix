import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { dateRangeQuery } from '../validators/commonValidators.js';
import * as ctrl from '../controllers/analyticsController.js';

const router = Router();
router.use(authenticate, authorize('Admin', 'Manager')); // analytics = managers & admins

router.get('/dashboard', validate({ query: dateRangeQuery }), ctrl.dashboard);
router.get('/sales-performance', validate({ query: dateRangeQuery }), ctrl.salesPerformance);
router.get('/profit', validate({ query: dateRangeQuery }), ctrl.profit);
router.get('/low-stock', ctrl.lowStock);
router.get('/inventory-valuation', ctrl.inventoryValuation);
router.get('/top-sellers', validate({ query: dateRangeQuery }), ctrl.topSellers);
router.get('/revenue-trend', validate({ query: dateRangeQuery }), ctrl.revenueTrend);
router.get(
  '/breakdown',
  validate({ query: dateRangeQuery.extend({ groupBy: z.enum(['category', 'cashier']).default('category') }) }),
  ctrl.salesBreakdown
);

export default router;
