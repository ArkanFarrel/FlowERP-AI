import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { validateRequest } from '../../common/middlewares/validation.middleware.js';
import { aiChatSchema } from './ai.dto.js';

const router = Router();
const controller = new AiController();

router.use(authenticate);

/**
 * @openapi
 * /ai/insights:
 *   get:
 *     summary: Get AI Business Health Score & Revenue Forecast
 *     tags: [AI Insights]
 *     security:
 *       - bearerAuth: []
 */
router.get('/insights', controller.getAiInsights);

/**
 * @openapi
 * /ai/predictions:
 *   get:
 *     summary: Get AI Low Stock Velocity Predictions
 *     tags: [AI Insights]
 *     security:
 *       - bearerAuth: []
 */
router.get('/predictions', controller.getStockPredictions);

/**
 * @openapi
 * /ai/chat:
 *   post:
 *     summary: Ask Natural Language AI Assistant
 *     tags: [AI Insights]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chat', validateRequest(aiChatSchema), controller.chat);

export default router;
