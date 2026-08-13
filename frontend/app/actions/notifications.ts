'use server';

import { ensureDefaultCompany } from "@/lib/company";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  category: 'inventory' | 'invoice' | 'system';
  link?: string;
  time: string;
}

/**
 * Server Action untuk mengambil notifikasi real-time persediaan stok kritis (< 5 pcs) & piutang/faktur jatuh tempo (overdue).
 */
export async function getRealtimeNotifications() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const company = await ensureDefaultCompany();

    const [criticalProducts, overdueSales] = await Promise.all([
      // 1. Stok produk kritis (< 5 pcs)
      prisma.product.findMany({
        where: {
          companyId: company.id,
          stock: { lte: 5 },
        },
        select: { id: true, name: true, sku: true, stock: true },
        take: 10,
      }),
      // 2. Piutang / Faktur penjualan jatuh tempo (Overdue)
      prisma.sale.findMany({
        where: {
          companyId: company.id,
          paymentStatus: { in: ['Overdue', 'Pending'] },
        },
        include: { customer: { select: { name: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const notifications: NotificationItem[] = [];

    // Map critical stock alerts
    criticalProducts.forEach((p) => {
      notifications.push({
        id: `stock-${p.id}`,
        title: `Stok Kritis: ${p.name}`,
        message: `Sisa stok produk (${p.sku}) tersisa ${p.stock} pcs! Harap lakukan restock segera.`,
        type: 'critical',
        category: 'inventory',
        link: '/ProductInventory',
        time: 'Real-time',
      });
    });

    // Map overdue invoices alerts
    overdueSales.forEach((s) => {
      notifications.push({
        id: `invoice-${s.id}`,
        title: `Faktur Overdue: #${s.orderNumber}`,
        message: `Tagihan ${s.customer?.name || 'Pelanggan'} sebesar $${s.total.toLocaleString()} belum dilunasi.`,
        type: 'warning',
        category: 'invoice',
        link: '/Sales',
        time: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending',
      });
    });

    return {
      success: true,
      count: notifications.length,
      criticalCount: criticalProducts.length,
      overdueCount: overdueSales.length,
      notifications,
    };
  } catch (error: unknown) {
    console.error("getRealtimeNotifications error:", error);
    return {
      success: false,
      count: 0,
      criticalCount: 0,
      overdueCount: 0,
      notifications: [],
    };
  }
}
