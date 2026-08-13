import { prisma } from '../../config/database.config.js';

export class FinanceRepository {
  // ─── Receivables (AR) ──────────────────────────────────────────────────────

  async getReceivables(companyId: string) {
    const orders = await prisma.salesOrder.findMany({
      where: {
        companyId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        customer: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
        salesperson: { select: { id: true, fullName: true } },
        payments: true,
        invoices: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return orders.map((o) => {
      const paidAmount = o.payments.reduce((acc, p) => acc + p.amount, 0);
      const remainingBalance = Math.max(0, Number(o.totalAmount) - paidAmount);
      return {
        ...o,
        paidAmount,
        remainingBalance,
      };
    });
  }

  async getReceivablesAging(companyId: string) {
    const orders = await prisma.salesOrder.findMany({
      where: {
        companyId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const buckets = {
      current: [] as typeof orders,       // 0-30 days
      days30: [] as typeof orders,        // 31-60 days
      days60: [] as typeof orders,        // 61-90 days
      days90Plus: [] as typeof orders,    // 91+ days
    };

    for (const o of orders) {
      const daysSince = Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / 86400000);
      const paidAmount = o.payments.reduce((acc, p) => acc + p.amount, 0);
      const enriched = { ...o, paidAmount, remainingBalance: Math.max(0, Number(o.totalAmount) - paidAmount), daysSince };
      if (daysSince <= 30) buckets.current.push(enriched as any);
      else if (daysSince <= 60) buckets.days30.push(enriched as any);
      else if (daysSince <= 90) buckets.days60.push(enriched as any);
      else buckets.days90Plus.push(enriched as any);
    }

    return buckets;
  }

  async getSalesOrderPayments(companyId: string, salesOrderId: string) {
    return prisma.payment.findMany({
      where: { companyId, salesOrderId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async recordReceivablePayment(companyId: string, data: {
    salesOrderId: string;
    amount: number;
    method: string;
    notes?: string;
    paymentDate?: string;
  }) {
    const order = await prisma.salesOrder.findFirst({
      where: { id: data.salesOrderId, companyId },
      include: { payments: true },
    });
    if (!order) throw new Error('Sales order not found');

    const totalPaid = order.payments.reduce((acc, p) => acc + p.amount, 0) + data.amount;
    const remaining = Number(order.totalAmount) - totalPaid;

    const refNum = `PAY-AR-${Date.now().toString().slice(-8)}`;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          companyId,
          referenceNumber: refNum,
          type: 'RECEIVABLE',
          salesOrderId: data.salesOrderId,
          amount: data.amount,
          method: data.method,
          notes: data.notes,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        },
      }),
      prisma.salesOrder.update({
        where: { id: data.salesOrderId },
        data: {
          paymentStatus: remaining <= 0.01 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
        },
      }),
    ]);

    return { payment, remainingBalance: Math.max(0, remaining), referenceNumber: refNum };
  }

  // ─── Payables (AP) ─────────────────────────────────────────────────────────

  async getPayables(companyId: string) {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        supplier: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
        createdBy: { select: { id: true, fullName: true } },
        payments: true,
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return orders.map((o) => {
      const paidAmount = o.payments.reduce((acc, p) => acc + p.amount, 0);
      const remainingBalance = Math.max(0, Number(o.totalAmount) - paidAmount);
      return { ...o, paidAmount, remainingBalance };
    });
  }

  async getPayablesAging(companyId: string) {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        supplier: { select: { id: true, name: true, companyName: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const buckets = {
      current: [] as any[],
      days30: [] as any[],
      days60: [] as any[],
      days90Plus: [] as any[],
    };

    for (const o of orders) {
      const daysSince = Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / 86400000);
      const paidAmount = o.payments.reduce((acc, p) => acc + p.amount, 0);
      const enriched = { ...o, paidAmount, remainingBalance: Math.max(0, Number(o.totalAmount) - paidAmount), daysSince };
      if (daysSince <= 30) buckets.current.push(enriched);
      else if (daysSince <= 60) buckets.days30.push(enriched);
      else if (daysSince <= 90) buckets.days60.push(enriched);
      else buckets.days90Plus.push(enriched);
    }

    return buckets;
  }

  async getPurchaseOrderPayments(companyId: string, purchaseOrderId: string) {
    return prisma.payment.findMany({
      where: { companyId, purchaseOrderId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async recordPayablePayment(companyId: string, data: {
    purchaseOrderId: string;
    amount: number;
    method: string;
    notes?: string;
    paymentDate?: string;
  }) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: data.purchaseOrderId, companyId },
      include: { payments: true },
    });
    if (!order) throw new Error('Purchase order not found');

    const totalPaid = order.payments.reduce((acc, p) => acc + p.amount, 0) + data.amount;
    const remaining = Number(order.totalAmount) - totalPaid;

    const refNum = `PAY-AP-${Date.now().toString().slice(-8)}`;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          companyId,
          referenceNumber: refNum,
          type: 'PAYABLE',
          purchaseOrderId: data.purchaseOrderId,
          amount: data.amount,
          method: data.method,
          notes: data.notes,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        },
      }),
      prisma.purchaseOrder.update({
        where: { id: data.purchaseOrderId },
        data: {
          paymentStatus: remaining <= 0.01 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
        },
      }),
    ]);

    return { payment, remainingBalance: Math.max(0, remaining), referenceNumber: refNum };
  }

  // ─── Per-Party Balances ─────────────────────────────────────────────────────

  async getCustomerBalances(companyId: string) {
    const orders = await prisma.salesOrder.findMany({
      where: {
        companyId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        customer: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by customer
    const customerMap: Record<string, {
      customerId: string;
      customerName: string;
      companyName?: string;
      email?: string;
      phone?: string;
      totalBilled: number;
      totalPaid: number;
      totalOutstanding: number;
      orderCount: number;
      oldestOrderDate: string;
      orders: typeof orders;
    }> = {};

    for (const o of orders) {
      const cid = o.customerId;
      const paid = o.payments.reduce((acc, p) => acc + p.amount, 0);
      const outstanding = Math.max(0, Number(o.totalAmount) - paid);
      if (!customerMap[cid]) {
        customerMap[cid] = {
          customerId: cid,
          customerName: o.customer.name,
          companyName: o.customer.companyName ?? undefined,
          email: o.customer.email ?? undefined,
          phone: o.customer.phone ?? undefined,
          totalBilled: 0, totalPaid: 0, totalOutstanding: 0, orderCount: 0,
          oldestOrderDate: o.createdAt.toISOString(),
          orders: [],
        };
      }
      customerMap[cid].totalBilled += Number(o.totalAmount);
      customerMap[cid].totalPaid += paid;
      customerMap[cid].totalOutstanding += outstanding;
      customerMap[cid].orderCount += 1;
      if (new Date(o.createdAt) < new Date(customerMap[cid].oldestOrderDate)) {
        customerMap[cid].oldestOrderDate = o.createdAt.toISOString();
      }
      customerMap[cid].orders.push(o);
    }

    return Object.values(customerMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }

  async getSupplierBalances(companyId: string) {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        supplier: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const supplierMap: Record<string, {
      supplierId: string;
      supplierName: string;
      companyName?: string;
      email?: string;
      phone?: string;
      totalBilled: number;
      totalPaid: number;
      totalOutstanding: number;
      orderCount: number;
      oldestOrderDate: string;
    }> = {};

    for (const o of orders) {
      const sid = o.supplierId;
      const paid = o.payments.reduce((acc, p) => acc + p.amount, 0);
      const outstanding = Math.max(0, Number(o.totalAmount) - paid);
      if (!supplierMap[sid]) {
        supplierMap[sid] = {
          supplierId: sid,
          supplierName: o.supplier.name,
          companyName: o.supplier.companyName ?? undefined,
          email: o.supplier.email ?? undefined,
          phone: o.supplier.phone ?? undefined,
          totalBilled: 0, totalPaid: 0, totalOutstanding: 0, orderCount: 0,
          oldestOrderDate: o.createdAt.toISOString(),
        };
      }
      supplierMap[sid].totalBilled += Number(o.totalAmount);
      supplierMap[sid].totalPaid += paid;
      supplierMap[sid].totalOutstanding += outstanding;
      supplierMap[sid].orderCount += 1;
      if (new Date(o.createdAt) < new Date(supplierMap[sid].oldestOrderDate)) {
        supplierMap[sid].oldestOrderDate = o.createdAt.toISOString();
      }
    }

    return Object.values(supplierMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }

  // ─── Summary ────────────────────────────────────────────────────────────────

  async getFinanceSummary(companyId: string) {
    const [arOrders, apOrders] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { companyId, paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
        include: { payments: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { companyId, paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
        include: { payments: true },
      }),
    ]);

    const totalAR = arOrders.reduce((acc, o) => {
      const paid = o.payments.reduce((a, p) => a + p.amount, 0);
      return acc + Math.max(0, Number(o.totalAmount) - paid);
    }, 0);

    const totalAP = apOrders.reduce((acc, o) => {
      const paid = o.payments.reduce((a, p) => a + p.amount, 0);
      return acc + Math.max(0, Number(o.totalAmount) - paid);
    }, 0);

    const overdueAR = arOrders.filter((o) => {
      const days = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 86400000);
      return days > 30;
    }).length;

    const overdueAP = apOrders.filter((o) => {
      const days = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 86400000);
      return days > 30;
    }).length;

    return {
      totalReceivables: totalAR,
      totalPayables: totalAP,
      overdueReceivables: overdueAR,
      overduePayables: overdueAP,
      openARCount: arOrders.length,
      openAPCount: apOrders.length,
    };
  }
}
