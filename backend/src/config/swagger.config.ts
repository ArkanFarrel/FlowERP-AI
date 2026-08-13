import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.config.js';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FlowERP-AI REST API',
      version: '1.0.0',
      description: 'Enterprise ERP Lite SaaS Backend REST API Documentation',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.dto.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
