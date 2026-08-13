import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.dto.js';

const router = Router();
const controller = new AuthController();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new Tenant Company and Owner User
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, companyName]
 *             properties:
 *               name:
 *                 type: string;
 *               email:
 *                 type: string;
 *               password:
 *                 type: string;
 *               companyName:
 *                 type: string;
 *     responses:
 *       201:
 *         description: Tenant registered successfully
 */
router.post('/register', validateRequest(registerSchema), controller.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User Authentication
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated successfully
 */
router.post('/login', validateRequest(loginSchema), controller.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [Authentication]
 */
router.post('/refresh', validateRequest(refreshTokenSchema), controller.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: User Logout
 *     tags: [Authentication]
 */
router.post('/logout', authenticate, controller.logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request Password Reset
 *     tags: [Authentication]
 */
router.post('/forgot-password', validateRequest(forgotPasswordSchema), controller.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset Password
 *     tags: [Authentication]
 */
router.post('/reset-password', validateRequest(resetPasswordSchema), controller.resetPassword);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Current Authenticated User Profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, controller.me);

export default router;
