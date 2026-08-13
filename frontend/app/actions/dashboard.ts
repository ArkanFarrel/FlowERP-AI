'use server';

import { prisma } from "@/lib/prisma";
import { ensureDefaultCompany } from "@/lib/company";

export async function getDashboardData() {
  try {
    const company = await ensureDefaultCompany();

    const [salesCount, totalRevenueAgg, productsCount, customersCount, lowStockProducts, recentSalesDb, stockMovementsDb, recentCustomersDb, allSales] = await Promise.all([
      prisma.sale.count({ where: { companyId: company.id } }),
      prisma.sale.aggregate({
        where: { companyId: company.id },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { companyId: company.id } }),
      prisma.customer.count({ where: { companyId: company.id } }),
      prisma.product.findMany({
        where: {
          companyId: company.id,
          stock: { lte: 15 },
        },
        take: 5,
        orderBy: { stock: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
        },
      }),
      prisma.sale.findMany({
        where: { companyId: company.id },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          paymentStatus: true,
          createdAt: true,
          customer: {
            select: { name: true, company: true },
          },
        },
      }),
      prisma.stockMovement.findMany({
        where: { companyId: company.id },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          quantity: true,
          notes: true,
          warehouse: true,
          createdAt: true,
          product: {
            select: { name: true },
          },
        },
      }),
      prisma.customer.findMany({
        where: { companyId: company.id },
        take: 4,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          company: true,
          createdAt: true,
        },
      }),
      prisma.sale.findMany({
        where: { companyId: company.id },
        select: { total: true, createdAt: true, date: true },
      }),
    ]);

    const totalRevenue = totalRevenueAgg._sum.total || 0;

    // Calculate dynamic 12-Month Revenue Data from database sales
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTotals: Record<number, number> = {};
    for (let i = 0; i < 12; i++) {
      monthlyTotals[i] = 0;
    }

    allSales.forEach((s) => {
      const saleDate = new Date(s.createdAt || s.date);
      const m = saleDate.getMonth();
      if (m >= 0 && m < 12) {
        monthlyTotals[m] = (monthlyTotals[m] || 0) + Number(s.total || 0);
      }
    });

    const revenueData = monthNames.map((month, idx) => ({
      month,
      revenue: Math.round(monthlyTotals[idx] || 0),
    }));

    // Calculate dynamic Weekly Sales Data (Mon-Sun) from database sales
    const dayMapName: Record<number, string> = {
      0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
    };
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyTotals: Record<string, number> = {
      Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
    };

    allSales.forEach((s) => {
      const saleDate = new Date(s.createdAt || s.date);
      const dayName = dayMapName[saleDate.getDay()];
      if (dayName && Object.prototype.hasOwnProperty.call(dailyTotals, dayName)) {
        dailyTotals[dayName] = (dailyTotals[dayName] || 0) + Number(s.total || 0);
      }
    });

    const weeklySalesData = dayOrder.map((day) => ({
      day,
      sales: Math.round(dailyTotals[day] || 0),
    }));

    const formattedLowStock = lowStockProducts.map((p, idx) => ({
      id: idx + 1,
      product: p.name,
      sku: p.sku,
      current: p.stock,
      minimum: p.minStock,
      status: p.stock === 0 ? "critical" : "warning",
    }));

    const formattedRecentSales = recentSalesDb.map((s, idx) => ({
      id: idx + 1,
      customer: s.customer?.company || s.customer?.name || "Walk-in Customer",
      invoice: s.orderNumber,
      amount: `$${s.total.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
      status: s.paymentStatus.toLowerCase(),
      date: s.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    }));

    const saleActivities = recentSalesDb.map((s) => ({
      id: `sale-${s.id}`,
      type: "order",
      title: `Order #${s.orderNumber} Created`,
      description: `${s.customer?.name || 'Customer'} - $${s.total.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
      timeDate: s.createdAt,
      time: s.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    }));

    const stockActivities = stockMovementsDb.map((sm) => {
      let title = sm.type === "STOCK_IN" ? "Stock Replenished" : sm.type === "STOCK_OUT" ? "Stock Sold" : sm.type === "TRANSFER" ? "Stock Transferred" : "Stock Adjustment";
      if (sm.notes && sm.notes.includes("Transfer Keluar")) {
        title = "Stock Transferred Out";
      } else if (sm.notes && sm.notes.includes("Transfer Masuk")) {
        title = "Stock Transferred In";
      }

      return {
        id: `stock-${sm.id}`,
        type: "stock",
        title,
        description: `${sm.product.name} (${sm.type === "STOCK_IN" ? "+" : sm.type === "TRANSFER" ? "➔ " : "-"}${sm.quantity} units) - ${sm.warehouse}`,
        timeDate: sm.createdAt,
        time: sm.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      };
    });

    const customerActivities = recentCustomersDb.map((c) => ({
      id: `customer-${c.id}`,
      type: "customer",
      title: "New Customer Registered",
      description: `${c.name} (${c.company || 'Retail'})`,
      timeDate: c.createdAt,
      time: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : 'Recently',
    }));

    const combinedActivities = [...saleActivities, ...stockActivities, ...customerActivities]
      .sort((a, b) => new Date(b.timeDate).getTime() - new Date(a.timeDate).getTime())
      .slice(0, 5)
      .map(({ id, type, title, description, time }) => ({ id, type, title, description, time }));

    const activities = combinedActivities.length > 0 ? combinedActivities : [
      {
        id: 'default-1',
        type: 'order',
        title: 'System Initialized',
        description: 'No activities recorded yet. Create orders or add products to view live logs.',
        time: 'Just now',
      },
    ];

    return {
      success: true,
      stats: {
        totalRevenue: `$${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        ordersCount: salesCount,
        productsCount: productsCount,
        customersCount: customersCount,
      },
      revenueData,
      weeklySalesData,
      lowStockProducts: formattedLowStock,
      recentSales: formattedRecentSales,
      activities,
    };
  } catch (error) {
    console.warn("Dashboard data DB connection note:", error instanceof Error ? error.message : String(error));
    
    return {
      success: true,
      stats: {
        totalRevenue: "$0",
        ordersCount: 0,
        productsCount: 0,
        customersCount: 0,
      },
      revenueData: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => ({ month, revenue: 0 })),
      weeklySalesData: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({ day, sales: 0 })),
      lowStockProducts: [],
      recentSales: [],
      activities: [],
    };
  }
}
