import { Response, NextFunction } from 'express';
import { FinanceService } from './finance.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class FinanceController {
  constructor(private service = new FinanceService()) {}

  // ─── AR ──────────────────────────────────────────────────────────────────────

  getReceivables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getReceivables(companyId);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  getReceivablesAging = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getReceivablesAging(companyId);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  getSalesOrderPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getSalesOrderPayments(companyId, req.params.salesOrderId as string);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  recordReceivablePayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.recordReceivablePayment(companyId, req.body);
      ApiResponse.created(res, result, 'Payment recorded successfully');
    } catch (error) { next(error); }
  };

  // ─── AP ──────────────────────────────────────────────────────────────────────

  getPayables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getPayables(companyId);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  getPayablesAging = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getPayablesAging(companyId);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  getPurchaseOrderPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getPurchaseOrderPayments(companyId, req.params.purchaseOrderId as string);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  recordPayablePayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.recordPayablePayment(companyId, req.body);
      ApiResponse.created(res, result, 'Payment recorded successfully');
    } catch (error) { next(error); }
  };

  // ─── Per-Party Balances ──────────────────────────────────────────────────────

  getCustomerBalances = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getCustomerBalances(companyId);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  getSupplierBalances = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getSupplierBalances(companyId);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };

  // ─── Summary ─────────────────────────────────────────────────────────────────

  getFinanceSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getFinanceSummary(companyId);
      ApiResponse.success(res, result);
    } catch (error) { next(error); }
  };
}
