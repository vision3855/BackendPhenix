import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { createProductSchema, updateProductSchema, listProductsQuery, adjustStockSchema } from '../validators/productValidators.js';
import { idParam } from '../validators/commonValidators.js';
import * as ctrl from '../controllers/productController.js';

const router = Router();
router.use(authenticate); // every product route requires a valid access token

router
  .route('/')
  .get(validate({ query: listProductsQuery }), ctrl.listProducts)
  .post(authorize('Admin', 'Manager'), validate({ body: createProductSchema }), ctrl.createProduct);

router
  .route('/:id')
  .get(validate({ params: idParam }), ctrl.getProduct)
  .patch(authorize('Admin', 'Manager'), validate({ params: idParam, body: updateProductSchema }), ctrl.updateProduct)
  .delete(authorize('Admin', 'Manager'), validate({ params: idParam }), ctrl.archiveProduct);

router.patch(
  '/:id/stock',
  authorize('Admin', 'Manager'),
  validate({ params: idParam, body: adjustStockSchema }),
  ctrl.adjustStock
);

export default router;
