import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { createSaleSchema, listSalesQuery } from '../validators/saleValidators.js';
import { idParam } from '../validators/commonValidators.js';
import * as ctrl from '../controllers/saleController.js';

const router = Router();
router.use(authenticate);

router
  .route('/')
  .get(authorize('Admin', 'Manager'), validate({ query: listSalesQuery }), ctrl.listSales)
  .post(validate({ body: createSaleSchema }), ctrl.createSale); // Cashier can sell

router.get('/:id', validate({ params: idParam }), ctrl.getSale);

export default router;
