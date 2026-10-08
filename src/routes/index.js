import { Router } from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import saleRoutes from './saleRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', uptime: process.uptime() })
);

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/sales', saleRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/inventory', inventoryRoutes);

export default router;
