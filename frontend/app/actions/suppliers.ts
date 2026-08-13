'use server';

import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { SupplierStatus } from "@prisma/client";
import { backendFetch } from "@/lib/backend-api";
import { ensureDefaultCompany } from "@/lib/company";

interface BackendSupplier {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  rating?: number;
  isActive?: boolean;
  _count?: { products?: number; purchases?: number };
}

export async function getSuppliers() {
  // Try backend API first
  try {
    const res = await backendFetch<BackendSupplier[]>('/suppliers');
    if (res.success && res.data && res.data.length > 0) {
      return {
        success: true,
        data: res.data.map((s, idx) => ({
          id: idx + 1,
          dbId: s.id,
          name: s.name,
          company: s.companyName || s.name,
          category: s.paymentTerms || 'General',
          phone: s.phone || '-',
          email: s.email || '-',
          orders: s._count?.purchases || 0,
          purchase: `$${((s._count?.purchases || 0) * 2500).toLocaleString()}`,
          status: s.isActive === false ? 'Inactive' : 'Active',
          rating: s.rating,
        })),
      };
    }
  } catch (backendErr) {
    console.warn('Backend API unavailable for getSuppliers, falling back to Prisma:', backendErr);
  }

  // Fallback to Prisma
  try {
    const company = await ensureDefaultCompany();
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: company.id },
      include: {
        purchases: { select: { id: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: suppliers.map((s) => {
        const orderCount = s.purchases?.length || 0;
        const totalVal = s.purchases?.reduce((acc, p) => acc + (p.totalAmount || 0), 0) || 0;

        return {
          id: s.id,
          dbId: s.id,
          name: s.name,
          company: s.company || s.name,
          category: s.category || 'General',
          phone: s.phone || '-',
          email: s.email || '-',
          orders: orderCount,
          purchase: `$${totalVal.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
          status: s.status || 'Active',
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return {
      success: false,
      data: [],
    };
  }
}

export async function createSupplier(input: Record<string, unknown>) {
  const validated = supplierSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  // Try backend API first
  try {
    const data = validated.data;
    const res = await backendFetch('/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        companyName: data.company,
        email: data.email,
        phone: data.phone,
        address: data.address,
        isActive: data.status !== 'Inactive',
      }),
    });

    if (res.success) {
      revalidatePath("/Suppliers");
      return { success: true, data: res.data };
    }
  } catch (backendErr) {
    console.warn('Backend API unavailable for createSupplier, falling back to Prisma:', backendErr);
  }

  // Fallback to Prisma
  try {
    const company = await ensureDefaultCompany();
    const data = validated.data;
    const newSupplier = await prisma.supplier.create({
      data: {
        name: data.name,
        company: data.company,
        category: data.category,
        email: data.email,
        phone: data.phone,
        address: data.address,
        status: (data.status as SupplierStatus) || SupplierStatus.Active,
        companyId: company.id,
      },
    });
    revalidatePath("/Suppliers");
    return { success: true, data: newSupplier };
  } catch (error) {
    console.error("Create supplier error:", error);
    return { success: false, error: "Failed to create supplier" };
  }
}

export async function deleteSupplier(id: string) {
  // Try backend API first
  try {
    const res = await backendFetch(`/suppliers/${id}`, { method: 'DELETE' });
    if (res.success) {
      revalidatePath("/Suppliers");
      return { success: true };
    }
  } catch (backendErr) {
    console.warn('Backend API unavailable for deleteSupplier, falling back to Prisma:', backendErr);
  }

  // Fallback to Prisma
  try {
    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/Suppliers");
    return { success: true };
  } catch (error) {
    console.error("Delete supplier error:", error);
    return { success: false, error: "Failed to delete supplier" };
  }
}
