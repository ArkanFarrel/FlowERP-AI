'use server';

import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { CustomerStatus } from "@prisma/client";
import { ensureDefaultCompany } from "@/lib/company";

export async function getCustomers() {
  try {
    const company = await ensureDefaultCompany();
    const customers = await prisma.customer.findMany({
      where: { companyId: company.id },
      include: {
        sales: {
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: customers.map((c) => {
        const orderCount = c.sales?.length || 0;
        const totalSalesSum = c.sales?.reduce((acc, s) => acc + (s.total || 0), 0) || 0;
        const totalLtv = totalSalesSum > 0 ? totalSalesSum : (c.lifetimeValue || 0);
        const lastSaleDate = c.sales && c.sales.length > 0 ? c.sales[0].createdAt : null;
        const lastPurchaseStr = lastSaleDate
          ? lastSaleDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "No orders";
        const avgOrder = orderCount > 0 ? Math.round(totalLtv / orderCount) : 0;

        return {
          id: c.code || c.id,
          dbId: c.id,
          name: c.name,
          company: c.company || c.name || '-',
          email: c.email || '-',
          phone: c.phone || '-',
          city: c.city || '-',
          country: c.country || '-',
          salesRep: c.salesRep || "Owner",
          orders: orderCount,
          lifetimeValue: totalLtv,
          status: c.status || 'Active',
          lastPurchase: lastPurchaseStr,
          type: c.type || 'Retail',
          address: c.address || "",
          memberSince: c.createdAt ? c.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : '-',
          assignedSalesperson: c.salesRep || "Owner",
          averagePurchase: avgOrder,
          creditLimit: c.creditLimit || 0,
          outstandingBalance: c.outstandingBalance || 0,
          loyaltyPoints: c.loyaltyPoints || 0,
          healthScore: c.healthScore || 100,
          segment: c.segment || 'Regular',
          revenue: totalLtv,
          growth: 0,
          avgOrder: avgOrder,
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return {
      success: false,
      data: [],
    };
  }
}

export async function createCustomer(input: Record<string, unknown>) {
  const validated = customerSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const company = await ensureDefaultCompany();
    const data = validated.data;

    const newCustomer = await prisma.customer.create({
      data: {
        code: `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        city: data.city,
        country: data.country,
        address: data.address,
        salesRep: data.salesRep || 'Owner',
        status: (data.status as CustomerStatus) || CustomerStatus.Active,
        type: data.type || 'Retail',
        creditLimit: data.creditLimit || 0,
        loyaltyPoints: data.loyaltyPoints || 0,
        companyId: company.id,
      },
    });

    try {
      revalidatePath("/Customers");
    } catch {
      // ignore revalidatePath errors outside Next.js request lifecycle
    }
    return { success: true, data: newCustomer };
  } catch (error: unknown) {
    console.error("Create customer error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create customer" };
  }
}

export async function deleteCustomer(id: string) {
  try {
    await prisma.customer.deleteMany({
      where: {
        OR: [
          { id: id },
          { code: id },
        ],
      },
    });

    revalidatePath("/Customers");
    return { success: true };
  } catch (error) {
    console.error("Delete customer error:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}

export async function updateCustomer(id: string, input: Record<string, unknown>) {
  try {
    const target = await prisma.customer.findFirst({
      where: {
        OR: [
          { id: id },
          { code: id },
        ],
      },
    });

    if (!target) {
      return { success: false, error: "Customer not found" };
    }

    const updated = await prisma.customer.update({
      where: { id: target.id },
      data: {
        name: input.name as string,
        company: input.company as string,
        email: input.email as string,
        phone: input.phone as string,
        city: input.city as string,
        country: input.country as string,
        address: input.address as string,
        creditLimit: Number(input.creditLimit) || 0,
      },
    });

    revalidatePath("/Customers");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Update customer error:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

// ─── Loyalty Points ───────────────────────────────────────────────────────────

/**
 * Redeem loyalty points. 1 point = Rp 500 discount. Minimum: 200 points.
 */
export async function redeemLoyaltyPoints(
  customerId: string,
  pointsToRedeem: number
): Promise<{ success: boolean; discountValue?: number; remainingPoints?: number; voucherCode?: string; error?: string }> {
  if (pointsToRedeem < 200) {
    return { success: false, error: 'Minimum penukaran poin adalah 200 poin.' };
  }
  try {
    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { code: customerId }] },
    });
    if (!customer) return { success: false, error: 'Pelanggan tidak ditemukan' };
    if (customer.loyaltyPoints < pointsToRedeem) {
      return { success: false, error: `Saldo poin tidak cukup. Saldo: ${customer.loyaltyPoints} poin.` };
    }
    const remainingPoints = customer.loyaltyPoints - pointsToRedeem;
    const discountValue = pointsToRedeem * 500;
    const voucherCode = `VCH-${Math.floor(10000 + Math.random() * 90000)}`;
    await prisma.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: remainingPoints },
    });
    revalidatePath('/Customers');
    return { success: true, discountValue, remainingPoints, voucherCode };
  } catch (error) {
    console.error('redeemLoyaltyPoints error:', error);
    return { success: false, error: 'Gagal menukarkan poin' };
  }
}

/**
 * Add loyalty points after purchase. 1 point per Rp 10,000 spent.
 */
export async function addLoyaltyPoints(
  customerId: string,
  purchaseAmount: number
): Promise<{ success: boolean; pointsEarned?: number; newTotal?: number; error?: string }> {
  try {
    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { code: customerId }] },
    });
    if (!customer) return { success: false, error: 'Pelanggan tidak ditemukan' };
    const pointsEarned = Math.floor(purchaseAmount / 10000);
    if (pointsEarned === 0) return { success: true, pointsEarned: 0, newTotal: customer.loyaltyPoints };
    const newTotal = customer.loyaltyPoints + pointsEarned;
    await prisma.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: newTotal },
    });
    revalidatePath('/Customers');
    return { success: true, pointsEarned, newTotal };
  } catch (error) {
    console.error('addLoyaltyPoints error:', error);
    return { success: false, error: 'Gagal menambahkan poin' };
  }
}

/**
 * Get top 10 customers by loyalty points.
 */
export async function getLoyaltyLeaderboard(): Promise<{
  success: boolean;
  data: Array<{ id: string; name: string; company: string; loyaltyPoints: number; segment: string; status: string }>;
}> {
  try {
    const company = await ensureDefaultCompany();
    const customers = await prisma.customer.findMany({
      where: { companyId: company.id, loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: 'desc' },
      take: 10,
      select: { id: true, name: true, company: true, loyaltyPoints: true, segment: true, status: true },
    });
    return {
      success: true,
      data: customers.map(c => ({
        id: c.id,
        name: c.name,
        company: c.company || c.name,
        loyaltyPoints: c.loyaltyPoints,
        segment: c.segment,
        status: c.status,
      })),
    };
  } catch (error) {
    console.error('getLoyaltyLeaderboard error:', error);
    return { success: false, data: [] };
  }
}

// ─── Due Date Alerts ─────────────────────────────────────────────────────────

export interface DueDateAlert {
  orderId: string;
  orderNumber: string;
  customerName: string;
  total: number;
  createdAt: string;
  dueDate: string;
  daysOverdue: number;
}

export async function getDueDateAlerts(): Promise<{ success: boolean; data: DueDateAlert[] }> {
  try {
    const company = await ensureDefaultCompany();
    const now = new Date();
    const sales = await prisma.sale.findMany({
      where: {
        companyId: company.id,
        paymentStatus: { in: ['Pending', 'Overdue'] },
      },
      include: { customer: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    const alerts: DueDateAlert[] = sales.map(s => {
      const dueDate = new Date(s.createdAt);
      dueDate.setDate(dueDate.getDate() + 30);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        orderId: s.id,
        orderNumber: s.orderNumber,
        customerName: s.customer?.name || s.customer?.company || 'Pelanggan',
        total: s.total,
        createdAt: new Date(s.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        dueDate: dueDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        daysOverdue,
      };
    });
    return { success: true, data: alerts.sort((a, b) => b.daysOverdue - a.daysOverdue) };
  } catch (error) {
    console.error('getDueDateAlerts error:', error);
    return { success: false, data: [] };
  }
}

export async function checkOverdueInvoicesAndNotify(): Promise<{ success: boolean; overdueCount?: number; notifiedCount?: number }> {
  try {
    const company = await ensureDefaultCompany();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const overdueSales = await prisma.sale.findMany({
      where: {
        companyId: company.id,
        OR: [
          { paymentStatus: 'Overdue' },
          { paymentStatus: 'Pending', createdAt: { lt: cutoff } },
        ],
      },
      include: { customer: true },
      take: 50,
    });
    let notifiedCount = 0;
    for (const sale of overdueSales) {
      try {
        const existing = await prisma.notification.findFirst({
          where: { companyId: company.id, title: { contains: sale.orderNumber } },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              title: `Invoice Overdue: #${sale.orderNumber}`,
              message: `Tagihan ${sale.customer?.name || 'N/A'} sebesar $${sale.total.toLocaleString()} jatuh tempo. Tanggal: ${new Date(sale.createdAt).toLocaleDateString('id-ID')}.`,
              type: 'warning',
              companyId: company.id,
            },
          });
          notifiedCount++;
        }
      } catch { /* ignore per-item */ }
    }
    return { success: true, overdueCount: overdueSales.length, notifiedCount };
  } catch (error) {
    console.error('checkOverdueInvoicesAndNotify error:', error);
    return { success: false };
  }
}

