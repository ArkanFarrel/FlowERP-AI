import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { logger } from './config/logger.config.js';
import { connectDatabase, prisma } from './config/database.config.js';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`API Base Endpoint: http://localhost:${env.PORT}${env.API_PREFIX}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await prisma.$disconnect();
        logger.info('Prisma disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
