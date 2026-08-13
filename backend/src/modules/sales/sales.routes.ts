import { Router } from 'express';
import { SalesController } from './sales.controller.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { createSalesOrderSchema, createSimpleSalesOrderSchema, updateSalesStatusSchema } from './sales.dto.js';

const router = Router();
const controller = new SalesController();

router.use(authenticate);

router.get('/', controller.getSalesOrders);
router.get('/metrics', controller.getSalesMetrics);
router.get('/:id', controller.getSalesOrderById);
router.post('/', validateRequest(createSalesOrderSchema), controller.createSalesOrder);
router.post('/simple', validateRequest(createSimpleSalesOrderSchema), controller.createSimpleSalesOrder);
router.patch('/:id/status', validateRequest(updateSalesStatusSchema), controller.updateSalesStatus);

export default router;
