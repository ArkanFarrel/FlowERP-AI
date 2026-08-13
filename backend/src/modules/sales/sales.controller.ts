import { Response, NextFunction } from 'express';
import { SalesService } from './sales.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class SalesController {
  constructor(private service = new SalesService()) {}

  getSalesOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getSalesOrders(companyId, req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSalesOrderById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getSalesOrderById(companyId, req.params.id as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  createSalesOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const salespersonId = req.tenantContext!.userId;
      const result = await this.service.createSalesOrder(companyId, salespersonId, req.body);
      ApiResponse.created(res, result, 'Sales order and invoice generated successfully');
    } catch (error) {
      next(error);
    }
  };

  createSimpleSalesOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const salespersonId = req.tenantContext!.userId;
      const result = await this.service.createSimpleSalesOrder(companyId, salespersonId, req.body);
      ApiResponse.created(res, result, 'Sales order created successfully');
    } catch (error) {
      next(error);
    }
  };

  updateSalesStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.updateSalesStatus(companyId, req.params.id as string, req.body);
      ApiResponse.success(res, result, 'Sales order status updated');
    } catch (error) {
      next(error);
    }
  };

  getSalesMetrics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getSalesMetrics(companyId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

