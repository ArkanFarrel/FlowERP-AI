import { Response, NextFunction } from 'express';
import { ReportService } from './report.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class ReportController {
  constructor(private service = new ReportService()) {}

  getInventoryReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getInventoryReport(companyId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSalesReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const { startDate, endDate } = req.query;
      const result = await this.service.getSalesReport(companyId, startDate as string, endDate as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPurchaseReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const { startDate, endDate } = req.query;
      const result = await this.service.getPurchaseReport(companyId, startDate as string, endDate as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
