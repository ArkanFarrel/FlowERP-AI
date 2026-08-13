import { Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class InventoryController {
  constructor(private service = new InventoryService()) {}

  getMovements = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getMovementHistory(companyId, req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  stockIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.stockIn(companyId, req.body);
      ApiResponse.created(res, result, 'Stock received successfully');
    } catch (error) {
      next(error);
    }
  };

  stockOut = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.stockOut(companyId, req.body);
      ApiResponse.created(res, result, 'Stock issued successfully');
    } catch (error) {
      next(error);
    }
  };

  stockAdjustment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.stockAdjustment(companyId, req.body);
      ApiResponse.success(res, result, 'Stock adjusted successfully');
    } catch (error) {
      next(error);
    }
  };
}
