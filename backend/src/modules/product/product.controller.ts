import { Response, NextFunction } from 'express';
import { ProductService } from './product.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class ProductController {
  constructor(private service = new ProductService()) {}

  getProducts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getProducts(companyId, req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getProductById(companyId, req.params.id as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.createProduct(companyId, req.body);
      ApiResponse.created(res, result, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.updateProduct(companyId, req.params.id as string, req.body);
      ApiResponse.success(res, result, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.deleteProduct(companyId, req.params.id as string);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  };
}
