import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.config.js';
import { logger } from './config/logger.config.js';
import { swaggerSpec } from './config/swagger.config.js';
import { errorHandler } from './common/middlewares/error-handler.middleware.js';
import { globalRateLimiter, authRateLimiter } from './common/middlewares/rate-limiter.middleware.js';
import { NotFoundError } from './common/errors/index.js';

// Module Routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import categoryRoutes from './modules/category/category.routes.js';
import productRoutes from './modules/product/product.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import supplierRoutes from './modules/supplier/supplier.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import purchaseRoutes from './modules/purchase/purchase.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportRoutes from './modules/report/report.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';

export const createApp = (): Express => {
  const app: Express = express();

  // Security Middlewares & Rate Limiting
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(globalRateLimiter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // HTTP Request Logging
  const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    })
  );

  // Health Check & Swagger OpenAPI Docs
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Mount API Module Routes
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/auth`, authRateLimiter, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/categories`, categoryRoutes);
  app.use(`${prefix}/products`, productRoutes);
  app.use(`${prefix}/customers`, customerRoutes);
  app.use(`${prefix}/suppliers`, supplierRoutes);
  app.use(`${prefix}/inventory`, inventoryRoutes);
  app.use(`${prefix}/sales`, salesRoutes);
  app.use(`${prefix}/purchases`, purchaseRoutes);
  app.use(`${prefix}/dashboard`, dashboardRoutes);
  app.use(`${prefix}/reports`, reportRoutes);
  app.use(`${prefix}/ai`, aiRoutes);

  // Base API Route
  app.get(`${prefix}`, (_req: Request, res: Response) => {
    res.status(200).json({
      message: 'Welcome to FlowERP-AI REST API',
      version: '1.0.0',
      documentation: '/api-docs',
    });
  });

  // 404 Handler
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError('The requested endpoint does not exist'));
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};
