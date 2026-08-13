import { Router } from 'express';
import { SupplierController } from './supplier.controller.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { createSupplierSchema, updateSupplierSchema } from './supplier.dto.js';

const router = Router();
const controller = new SupplierController();

router.use(authenticate);

/**
 * @openapi
 * /suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.getSuppliers);

/**
 * @openapi
 * /suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', controller.getSupplierById);

/**
 * @openapi
 * /suppliers:
 *   post:
 *     summary: Create new supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', validateRequest(createSupplierSchema), controller.createSupplier);

/**
 * @openapi
 * /suppliers/{id}:
 *   put:
 *     summary: Update supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', validateRequest(updateSupplierSchema), controller.updateSupplier);

/**
 * @openapi
 * /suppliers/{id}:
 *   delete:
 *     summary: Delete supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', controller.deleteSupplier);

export default router;
