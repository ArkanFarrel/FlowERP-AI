import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class AuthController {
  constructor(private authService = new AuthService()) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      ApiResponse.created(res, result, 'Tenant and user registered successfully');
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      ApiResponse.success(res, result, 'User authenticated successfully');
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.refresh(req.body);
      ApiResponse.success(res, result, 'Access token refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      ApiResponse.success(res, null, 'User logged out successfully');
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.forgotPassword(req.body);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.resetPassword(req.body);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  };

  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      ApiResponse.success(res, req.user);
    } catch (error) {
      next(error);
    }
  };
}
