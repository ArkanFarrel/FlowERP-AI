import { prisma } from '../../config/database.config.js';

export class ReportRepository {
  async getInventoryReport(companyId: string) {
    const products = await prisma.product.findMany({
      where: { companyId },
      include: { category: true, supplier: true },
      orderBy: { stock: 'asc' },
    });

    let totalValuationCost = 0;
    let totalValuationSelling = 0;
    let totalStockCount = 0;
    let lowStockCount = 0;

    const items = products.map((p) => {
      const costVal = Number(p.costPrice) * p.stock;
      const sellingVal = Number(p.sellingPrice) * p.stock;
      totalValuationCost += costVal;
      totalValuationSelling += sellingVal;
      totalStockCount += p.stock;

      if (p.stock <= p.minimumStock) lowStockCount++;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category?.name || 'Uncategorized',
        supplier: p.supplier?.name || 'N/A',
        stock: p.stock,
        minimumStock: p.minimumStock,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        inventoryCostValuation: costVal,
        inventorySellingValuation: sellingVal,
        isLowStock: p.stock <= p.minimumStock,
      };
    });

    return {
      summary: {
        totalProducts: products.length,
        totalStockCount,
        lowStockCount,
        totalValuationCost,
        totalValuationSelling,
        potentialProfit: totalValuationSelling - totalValuationCost,
      },
      items,
    };
  }

  async getSalesReport(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalProfit = 0;

    const orderSummaries = salesOrders.map((so) => {
      totalRevenue += Number(so.totalAmount);
      totalTax += Number(so.tax);
      totalDiscount += Number(so.discount);

      let orderCost = 0;
      so.items.forEach((item) => {
        orderCost += Number(item.product.costPrice) * item.quantity;
      });
      const orderProfit = Number(so.subtotal) - orderCost;
      totalProfit += orderProfit;

      return {
        id: so.id,
        orderNumber: so.orderNumber,
        date: so.createdAt,
        customerName: so.customer.name,
        totalAmount: Number(so.totalAmount),
        paymentStatus: so.paymentStatus,
        status: so.status,
        profit: orderProfit,
      };
    });

    return {
      summary: {
        totalOrders: salesOrders.length,
        totalRevenue,
        totalTax,
        totalDiscount,
        totalProfit,
        averageOrderValue: salesOrders.length > 0 ? totalRevenue / salesOrders.length : 0,
      },
      orders: orderSummaries,
    };
  }

  async getPurchaseReport(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSpend = 0;
    let pendingDeliveries = 0;

    const orders = purchaseOrders.map((po) => {
      totalSpend += Number(po.totalAmount);
      if (po.status === 'PENDING') pendingDeliveries++;

      return {
        id: po.id,
        poNumber: po.poNumber,
        date: po.createdAt,
        supplierName: po.supplier.name,
        totalAmount: Number(po.totalAmount),
        status: po.status,
        itemCount: po.items.length,
      };
    });

    return {
      summary: {
        totalPurchaseOrders: purchaseOrders.length,
        totalSpend,
        pendingDeliveries,
      },
      orders,
    };
  }
}
