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
