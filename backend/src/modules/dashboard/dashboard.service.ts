import { DashboardRepository } from './dashboard.repository.js';

export class DashboardService {
  constructor(private repository = new DashboardRepository()) {}

  async getDashboardData(companyId: string) {
    const [metrics, recentSales, weeklySales, monthlyRevenue, topProducts] = await Promise.all([
      this.repository.getMetricsSummary(companyId),
      this.repository.getRecentSales(companyId),
      this.repository.getWeeklySalesData(companyId),
      this.repository.getMonthlyRevenueData(companyId),
      this.repository.getTopSellingProducts(companyId),
    ]);

    return {
      metrics,
      recentSales,
      weeklySales,
      monthlyRevenue,
      topProducts,
    };
  }
}
