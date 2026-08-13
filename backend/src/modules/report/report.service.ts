import { ReportRepository } from './report.repository.js';

export class ReportService {
  constructor(private repository = new ReportRepository()) {}

  async getInventoryReport(companyId: string) {
    return this.repository.getInventoryReport(companyId);
  }

  async getSalesReport(companyId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.repository.getSalesReport(companyId, start, end);
  }

  async getPurchaseReport(companyId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.repository.getPurchaseReport(companyId, start, end);
  }
}
