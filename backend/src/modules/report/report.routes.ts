import { Router } from 'express';
import { ReportController } from './report.controller.js';
import { authenticate, authorizeRoles } from '../../common/middlewares/auth.middleware.js';

const router = Router();
const controller = new ReportController();

router.use(authenticate);

/**
 * @openapi
 * /reports/inventory:
 *   get:
 *     summary: Generate Inventory Valuation & Low Stock Report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/inventory', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'), controller.getInventoryReport);

/**
 * @openapi
 * /reports/sales:
 *   get:
 *     summary: Generate Sales Revenue & Profit Performance Report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/sales', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'FINANCE', 'SALES'), controller.getSalesReport);

/**
 * @openapi
 * /reports/purchase:
 *   get:
 *     summary: Generate Purchase Orders & Supplier Spending Report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/purchase', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'FINANCE'), controller.getPurchaseReport);

export default router;
