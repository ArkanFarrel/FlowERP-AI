import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';

const router = Router();
const controller = new DashboardController();

router.use(authenticate);

/**
 * @openapi
 * /dashboard:
 *   get:
 *     summary: Get executive dashboard KPIs, charts, and metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.getDashboardData);

export default router;
