import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../config/logger.config.js';
import { env } from '../../config/env.config.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details || null,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: err.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  logger.error(`[Unhandled Error] ${err.message}`, { stack: err.stack });

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      details: err.message || String(err),
    },
  });
};
