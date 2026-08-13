import { Response, NextFunction } from 'express';
import { AiService } from './ai.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class AiController {
  constructor(private service = new AiService()) {}

  getAiInsights = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const data = await this.service.getAiInsights(companyId);
      ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  };

  getStockPredictions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const data = await this.service.getStockPredictions(companyId);
      ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  };

  chat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const { message } = req.body;
      const result = await this.service.processChatQuery(companyId, message);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
