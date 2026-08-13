import { Router } from 'express';
import { CustomerController } from './customer.controller.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { createCustomerSchema, updateCustomerSchema } from './customer.dto.js';

const router = Router();
const controller = new CustomerController();

router.use(authenticate);

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.getCustomers);

/**
 * @openapi
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', controller.getCustomerById);

/**
 * @openapi
 * /customers:
 *   post:
 *     summary: Create new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', validateRequest(createCustomerSchema), controller.createCustomer);

/**
 * @openapi
 * /customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', validateRequest(updateCustomerSchema), controller.updateCustomer);

/**
 * @openapi
 * /customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', controller.deleteCustomer);

export default router;
