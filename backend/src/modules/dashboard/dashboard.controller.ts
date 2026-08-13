import { Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class DashboardController {
  constructor(private service = new DashboardService()) {}

  getDashboardData = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const data = await this.service.getDashboardData(companyId);
      ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  };
}
