import { Router } from 'express';
import { PurchaseController } from './purchase.controller.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { createPurchaseOrderSchema } from './purchase.dto.js';

const router = Router();
const controller = new PurchaseController();

router.use(authenticate);

/**
 * @openapi
 * /purchases:
 *   get:
 *     summary: Get all purchase orders
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.getPurchaseOrders);

/**
 * @openapi
 * /purchases/{id}:
 *   get:
 *     summary: Get purchase order by ID
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', controller.getPurchaseOrderById);

/**
 * @openapi
 * /purchases:
 *   post:
 *     summary: Create new Purchase Order
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', validateRequest(createPurchaseOrderSchema), controller.createPurchaseOrder);

/**
 * @openapi
 * /purchases/{id}/receive:
 *   post:
 *     summary: Mark Goods Received (Increments inventory stock)
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/receive', controller.receiveGoods);

export default router;
