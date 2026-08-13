import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate, authorizeRoles } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { stockMovementSchema, stockAdjustmentSchema } from './inventory.dto.js';

const router = Router();
const controller = new InventoryController();

router.use(authenticate);

/**
 * @openapi
 * /inventory/movements:
 *   get:
 *     summary: Get stock movement history
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/movements', controller.getMovements);

/**
 * @openapi
 * /inventory/stock-in:
 *   post:
 *     summary: Record Stock In (Receiving)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post('/stock-in', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'), validateRequest(stockMovementSchema), controller.stockIn);

/**
 * @openapi
 * /inventory/stock-out:
 *   post:
 *     summary: Record Stock Out (Dispatching)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post('/stock-out', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SALES', 'STAFF'), validateRequest(stockMovementSchema), controller.stockOut);

/**
 * @openapi
 * /inventory/adjustment:
 *   post:
 *     summary: Manual Stock Level Adjustment
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post('/adjustment', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'), validateRequest(stockAdjustmentSchema), controller.stockAdjustment);

export default router;
