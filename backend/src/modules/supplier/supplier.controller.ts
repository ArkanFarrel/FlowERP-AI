import { Response, NextFunction } from 'express';
import { SupplierService } from './supplier.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class SupplierController {
  constructor(private service = new SupplierService()) {}

  getSuppliers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getSuppliers(companyId, req.query.search as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSupplierById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getSupplierById(companyId, req.params.id as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  createSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.createSupplier(companyId, req.body);
      ApiResponse.created(res, result, 'Supplier created successfully');
    } catch (error) {
      next(error);
    }
  };

  updateSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.updateSupplier(companyId, req.params.id as string, req.body);
      ApiResponse.success(res, result, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.deleteSupplier(companyId, req.params.id as string);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  };
}
