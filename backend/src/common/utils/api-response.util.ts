import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200, meta?: any): void {
    res.status(statusCode).json({
      success: true,
      ...(message ? { message } : {}),
      data,
      ...(meta ? { meta } : {}),
    });
  }

  static created<T>(res: Response, data: T, message = 'Resource created successfully'): void {
    res.status(201).json({
      success: true,
      message,
      data,
    });
  }
}
