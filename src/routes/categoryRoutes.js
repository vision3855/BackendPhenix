import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { categorySchema, updateCategorySchema } from '../validators/categoryValidators.js';
import { idParam } from '../validators/commonValidators.js';
import * as ctrl from '../controllers/categoryController.js';

const router = Router();
router.use(authenticate);

router
  .route('/')
  .get(ctrl.listCategories)
  .post(authorize('Admin', 'Manager'), validate({ body: categorySchema }), ctrl.createCategory);

router
  .route('/:id')
  .patch(authorize('Admin', 'Manager'), validate({ params: idParam, body: updateCategorySchema }), ctrl.updateCategory)
  .delete(authorize('Admin', 'Manager'), validate({ params: idParam }), ctrl.deleteCategory);

export default router;
