import { Response, NextFunction } from 'express';
import { PurchaseService } from './purchase.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class PurchaseController {
  constructor(private service = new PurchaseService()) {}

  getPurchaseOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getPurchaseOrders(companyId, req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPurchaseOrderById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getPurchaseOrderById(companyId, req.params.id as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  createPurchaseOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const createdById = req.tenantContext!.userId;
      const result = await this.service.createPurchaseOrder(companyId, createdById, req.body);
      ApiResponse.created(res, result, 'Purchase order created successfully');
    } catch (error) {
      next(error);
    }
  };

  receiveGoods = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.receiveGoods(companyId, req.params.id as string);
      ApiResponse.success(res, result, 'Goods received and inventory updated');
    } catch (error) {
      next(error);
    }
  };
}
