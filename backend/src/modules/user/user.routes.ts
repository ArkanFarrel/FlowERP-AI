import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate, authorizeRoles } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { createUserSchema, updateUserSchema } from './user.dto.js';

const router = Router();
const controller = new UserController();

router.use(authenticate);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all tenant users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.getUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', controller.getUserById);

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create new tenant user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authorizeRoles('OWNER', 'ADMIN'), validateRequest(createUserSchema), controller.createUser);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update tenant user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authorizeRoles('OWNER', 'ADMIN'), validateRequest(updateUserSchema), controller.updateUser);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete tenant user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authorizeRoles('OWNER'), controller.deleteUser);

export default router;
