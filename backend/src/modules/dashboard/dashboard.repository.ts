import { prisma } from '../../config/database.config.js';

export class DashboardRepository {
  async getMetricsSummary(companyId: string) {
    const totalSalesOrders = await prisma.salesOrder.count({ where: { companyId } });
    const totalCustomers = await prisma.customer.count({ where: { companyId } });
    const totalProducts = await prisma.product.count({ where: { companyId } });

    // Sum revenue from paid sales orders
    const revenueAggregate = await prisma.salesOrder.aggregate({
      where: { companyId, paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    });

    const lowStockProducts = await prisma.product.findMany({
      where: {
        companyId,
        stock: { lte: prisma.product.fields.minimumStock },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minimumStock: true,
        warehouse: true,
      },
    });

    return {
      totalRevenue: Number(revenueAggregate._sum.totalAmount || 0),
      totalOrders: totalSalesOrders,
      totalCustomers,
      totalProducts,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    };
  }

  async getRecentSales(companyId: string, limit = 5) {
    return prisma.salesOrder.findMany({
      where: { companyId },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getWeeklySalesData(companyId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sales = await prisma.salesOrder.findMany({
      where: {
        companyId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const daysMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    sales.forEach((s) => {
      const day = dayNames[s.createdAt.getDay()];
      daysMap[day] = (daysMap[day] || 0) + Number(s.totalAmount);
    });

    return Object.entries(daysMap).map(([day, sales]) => ({ day, sales }));
  }

  async getMonthlyRevenueData(companyId: string) {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const sales = await prisma.salesOrder.findMany({
      where: {
        companyId,
        createdAt: { gte: startOfYear },
        paymentStatus: 'PAID',
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap: Record<string, number> = {};
    monthNames.forEach((m) => (monthlyMap[m] = 0));

    sales.forEach((s) => {
      const m = monthNames[s.createdAt.getMonth()];
      monthlyMap[m] += Number(s.totalAmount);
    });

    return Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue }));
  }

  async getTopSellingProducts(companyId: string, limit = 5) {
    const items = await prisma.salesItem.groupBy({
      by: ['productId'],
      where: { salesOrder: { companyId } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        product: product ? product.name : 'Unknown Product',
        sku: product ? product.sku : '',
        totalSold: item._sum.quantity || 0,
        totalRevenue: Number(item._sum.subtotal || 0),
      };
    });
  }
}
