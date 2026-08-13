import { FinanceRepository } from './finance.repository.js';

export class FinanceService {
  constructor(private repo = new FinanceRepository()) {}

  async getReceivables(companyId: string) {
    return this.repo.getReceivables(companyId);
  }

  async getReceivablesAging(companyId: string) {
    return this.repo.getReceivablesAging(companyId);
  }

  async getSalesOrderPayments(companyId: string, salesOrderId: string) {
    return this.repo.getSalesOrderPayments(companyId, salesOrderId);
  }

  async recordReceivablePayment(companyId: string, data: {
    salesOrderId: string;
    amount: number;
    method: string;
    notes?: string;
    paymentDate?: string;
  }) {
    if (!data.salesOrderId) throw new Error('salesOrderId is required');
    if (!data.amount || data.amount <= 0) throw new Error('amount must be greater than 0');
    return this.repo.recordReceivablePayment(companyId, data);
  }

  async getPayables(companyId: string) {
    return this.repo.getPayables(companyId);
  }

  async getPayablesAging(companyId: string) {
    return this.repo.getPayablesAging(companyId);
  }

  async getPurchaseOrderPayments(companyId: string, purchaseOrderId: string) {
    return this.repo.getPurchaseOrderPayments(companyId, purchaseOrderId);
  }

  async recordPayablePayment(companyId: string, data: {
    purchaseOrderId: string;
    amount: number;
    method: string;
    notes?: string;
    paymentDate?: string;
  }) {
    if (!data.purchaseOrderId) throw new Error('purchaseOrderId is required');
    if (!data.amount || data.amount <= 0) throw new Error('amount must be greater than 0');
    return this.repo.recordPayablePayment(companyId, data);
  }

  async getCustomerBalances(companyId: string) {
    return this.repo.getCustomerBalances(companyId);
  }

  async getSupplierBalances(companyId: string) {
    return this.repo.getSupplierBalances(companyId);
  }

  async getFinanceSummary(companyId: string) {
    return this.repo.getFinanceSummary(companyId);
  }
}
