import { Router } from 'express';
import { CategoryController } from './category.controller.js';
import { authenticate, authorizeRoles } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { createCategorySchema, updateCategorySchema } from './category.dto.js';

const router = Router();
const controller = new CategoryController();

router.use(authenticate);

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.getCategories);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', controller.getCategoryById);

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'), validateRequest(createCategorySchema), controller.createCategory);

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authorizeRoles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'), validateRequest(updateCategorySchema), controller.updateCategory);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authorizeRoles('OWNER', 'ADMIN', 'MANAGER'), controller.deleteCategory);

export default router;
