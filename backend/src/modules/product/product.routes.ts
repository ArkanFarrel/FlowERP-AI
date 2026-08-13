import { Router } from 'express';
import { ProductController } from './product.controller.js';
import { authenticate, authorizeRoles } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { createProductSchema, updateProductSchema } from './product.dto.js';

const router = Router();
const controller = new ProductController();

router.use(authenticate);

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Get all catalog products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.getProducts);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', controller.getProductById);

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'), validateRequest(createProductSchema), controller.createProduct);

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Update product details
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'), validateRequest(updateProductSchema), controller.updateProduct);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authorizeRoles('OWNER', 'ADMIN', 'MANAGER'), controller.deleteProduct);

export default router;
