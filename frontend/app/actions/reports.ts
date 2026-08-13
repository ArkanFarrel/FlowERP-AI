'use server';

import { prisma } from "@/lib/prisma";
import { ensureDefaultCompany } from "@/lib/company";
import { getSales } from "@/app/actions/sales";

export async function getReportsData() {
  try {
    const company = await ensureDefaultCompany();

    const [salesDb, productsDb, customersCount] = await Promise.all([
      prisma.sale.findMany({
        where: { companyId: company.id },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: { companyId: company.id },
        include: {
          category: true,
          saleItems: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where: { companyId: company.id } }),
    ]);

    // Normalize sales data from Prisma DB with fallback to getSales Server Action
    const normalizedSales: Array<{
      id: string;
      orderNumber: string;
      total: number;
      paymentStatus: string;
      createdAt: Date;
      customerName: string;
    }> = salesDb.map((s) => ({
      id: s.id,
      orderNumber: s.orderNumber,
      total: s.total || 0,
      paymentStatus: s.paymentStatus || 'Paid',
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      customerName: s.customer?.company || s.customer?.name || 'Walk-in Customer',
    }));

    if (normalizedSales.length === 0) {
      try {
        const salesAction = await getSales();
        if (salesAction && salesAction.success && Array.isArray(salesAction.data)) {
          salesAction.data.forEach((s) => {
            const rawTotal = Number(String(s.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
            normalizedSales.push({
              id: s.dbId || s.order || String(Math.random()),
              orderNumber: s.order || `SO-${s.dbId}`,
              total: rawTotal,
              paymentStatus: s.payment || 'Paid',
              createdAt: s.date ? new Date(s.date) : new Date(),
              customerName: s.customer || 'Walk-in Customer',
            });
          });
        }
      } catch {
        // ignore
      }
    }

    const totalRevenueVal = normalizedSales.reduce((acc, s) => acc + s.total, 0);
    const salesCount = normalizedSales.length;
    const inventoryVal = productsDb.reduce((acc, p) => acc + (p.stock * (p.costPrice || 0)), 0);
    const totalRevenueStr = `$${totalRevenueVal.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

    // Inventory metrics
    const totalProductsCount = productsDb.length;
    const inStockCount = productsDb.filter((p) => p.stock > (p.minStock || 5)).length;
    const lowStockCount = productsDb.filter((p) => p.stock > 0 && p.stock <= (p.minStock || 5)).length;
    const outOfStockCount = productsDb.filter((p) => p.stock === 0).length;

    // Monthly revenue trend (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyTrendData: Array<{ month: string; revenue: number; percentage: number }> = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const mName = monthNames[mIdx];

      const monthRev = normalizedSales.reduce((acc, s) => {
        const sDate = s.createdAt;
        if (sDate.getMonth() === mIdx && sDate.getFullYear() === yr) {
          return acc + s.total;
        }
        return acc;
      }, 0);

      monthlyTrendData.push({ month: mName, revenue: monthRev, percentage: 0 });
    }

    const maxRev = Math.max(...monthlyTrendData.map((m) => m.revenue), 1);
    monthlyTrendData.forEach((m) => {
      m.percentage = m.revenue > 0 ? Math.min(100, Math.max(15, Math.round((m.revenue / maxRev) * 100))) : 10;
    });

    // Top Selling Products
    const topProducts = productsDb.map((p) => {
      const unitsSold = p.saleItems ? p.saleItems.reduce((acc, item) => acc + item.quantity, 0) : 0;
      const revenueVal = unitsSold * (p.sellingPrice || 0);
      return {
        name: p.name,
        sku: p.sku || 'PRD-001',
        category: p.category?.name || p.categoryName || 'General',
        units: unitsSold,
        revenue: `$${revenueVal.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
        growth: unitsSold > 0 ? 'Real' : '0%',
      };
    }).sort((a, b) => b.units - a.units).slice(0, 5);

    // Sales payment status breakdown
    const paidSalesCount = normalizedSales.filter((s) => s.paymentStatus === 'Paid').length;
    const pendingSalesCount = normalizedSales.filter((s) => s.paymentStatus === 'Pending').length;
    const overdueSalesCount = normalizedSales.filter((s) => s.paymentStatus === 'Overdue').length;
    const totalStatusSales = normalizedSales.length || 1;

    const paymentBreakdown = [
      { label: 'Paid Sales', value: `${Math.round((paidSalesCount / totalStatusSales) * 100)}%`, color: '#0284c7' },
      { label: 'Pending Sales', value: `${Math.round((pendingSalesCount / totalStatusSales) * 100)}%`, color: '#38bdf8' },
      { label: 'Overdue Sales', value: `${Math.round((overdueSalesCount / totalStatusSales) * 100)}%`, color: '#f43f5e' },
    ];

    // Recent Reports / Recent Sales orders
    const recentReports = normalizedSales.slice(0, 5).map((s) => ({
      title: `Sale Order #${s.orderNumber} Recorded - ${s.customerName}`,
      time: s.createdAt ? s.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : 'Recently',
    }));

    return {
      success: true,
      summary: {
        totalRevenue: totalRevenueStr,
        totalSales: salesCount.toLocaleString(),
        inventoryValue: `$${inventoryVal.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
        activeCustomers: customersCount.toLocaleString(),
      },
      inventoryMetrics: [
        { label: 'Total Products', value: `${totalProductsCount} Items`, trend: 'Real Data', positive: true },
        { label: 'In Stock', value: `${inStockCount} Items`, trend: 'Real Data', positive: true },
        { label: 'Low Stock', value: `${lowStockCount} Items`, trend: 'Real Data', positive: false },
        { label: 'Out of Stock', value: `${outOfStockCount} Items`, trend: 'Real Data', positive: false },
      ],
      monthlyTrendData,
      paymentBreakdown,
      topProducts,
      recentReports,
    };
  } catch (error) {
    console.error("Reports data error:", error);
    return {
      success: false,
      summary: {
        totalRevenue: "$0.00",
        totalSales: "0",
        inventoryValue: "$0.00",
        activeCustomers: "0",
      },
      inventoryMetrics: [
        { label: 'Total Products', value: '0 Items', trend: '0%', positive: true },
        { label: 'In Stock', value: '0 Items', trend: '0%', positive: true },
        { label: 'Low Stock', value: '0 Items', trend: '0%', positive: false },
        { label: 'Out of Stock', value: '0 Items', trend: '0%', positive: false },
      ],
      monthlyTrendData: [],
      paymentBreakdown: [],
      topProducts: [],
      recentReports: [],
    };
  }
}
