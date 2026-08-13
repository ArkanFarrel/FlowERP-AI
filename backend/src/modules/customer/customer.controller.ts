import { Response, NextFunction } from 'express';
import { CustomerService } from './customer.service.js';
import { AuthenticatedRequest } from '../../common/types/request.type.js';
import { ApiResponse } from '../../common/utils/api-response.util.js';

export class CustomerController {
  constructor(private service = new CustomerService()) {}

  getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getCustomers(companyId, req.query.search as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.getCustomerById(companyId, req.params.id as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.createCustomer(companyId, req.body);
      ApiResponse.created(res, result, 'Customer created successfully');
    } catch (error) {
      next(error);
    }
  };

  updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.updateCustomer(companyId, req.params.id as string, req.body);
      ApiResponse.success(res, result, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.tenantContext!.companyId;
      const result = await this.service.deleteCustomer(companyId, req.params.id as string);
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  };
}
