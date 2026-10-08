import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import * as ctrl from '../controllers/authController.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), ctrl.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/refresh', authLimiter, ctrl.refresh); // reads httpOnly cookie
router.post('/logout', ctrl.logout);
router.post('/logout-all', authenticate, ctrl.logoutAll);
router.get('/me', authenticate, ctrl.me);

export default router;
