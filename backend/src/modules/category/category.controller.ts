import { Response, NextFunction } from 'express';
import { CategoryService } from './category.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class CategoryController {
  constructor(private service = new CategoryService()) {}

  getCategories = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCategories(req.tenantContext!.companyId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCategoryById(req.tenantContext!.companyId, req.params.id as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createCategory(req.tenantContext!.companyId, req.body);
      ApiResponse.created(res, result, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateCategory(req.tenantContext!.companyId, req.params.id as string, req.body);
      ApiResponse.success(res, result, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.deleteCategory(req.tenantContext!.companyId, req.params.id as string);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  };
}
