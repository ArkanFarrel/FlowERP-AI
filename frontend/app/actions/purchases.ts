'use server';

import { prisma } from "@/lib/prisma";
import { purchaseSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { PurchaseStatus } from "@prisma/client";
import { getSuppliers } from "@/app/actions/suppliers";
import { ensureDefaultCompany } from "@/lib/company";

export async function getPurchaseFormData() {
  try {
    const company = await ensureDefaultCompany();
    
    // Fetch suppliers via getSuppliers first
    const supRes = await getSuppliers();
    let suppliersList: Array<{ id: string; name: string }> = [];

    if (supRes && supRes.success && Array.isArray(supRes.data) && supRes.data.length > 0) {
      suppliersList = supRes.data.map((s: { id?: string | number; dbId?: string; name?: string; company?: string }) => ({
        id: String(s.dbId || s.id || ''),
        name: s.company && s.company !== s.name ? `${s.name || ''} (${s.company})` : (s.name || ''),
      }));
    } else {
      const dbSuppliers = await prisma.supplier.findMany({
        where: { companyId: company.id },
        select: { id: true, name: true, company: true },
        orderBy: { createdAt: "desc" },
      });
      suppliersList = dbSuppliers.map((s) => ({
        id: s.id,
        name: s.company && s.company !== s.name ? `${s.name} (${s.company})` : s.name,
      }));
    }

    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true, costPrice: true, stock: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      suppliers: suppliersList,
      products: products.map((p) => ({ id: p.id, name: p.name, costPrice: p.costPrice || 0, stock: p.stock })),
    };
  } catch (error) {
    console.error("Error fetching purchase form data:", error);
    return { success: false, suppliers: [], products: [] };
  }
}

export async function getPurchases() {
  try {
    const company = await ensureDefaultCompany();
    const purchases = await prisma.purchase.findMany({
      where: { companyId: company.id },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalOrders = purchases.length;
    const totalValue = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const pendingDeliveries = purchases.filter((p) => p.status === 'Ordered' || p.status === 'Processing' || p.status === 'Shipping').length;
    const completedOrders = purchases.filter((p) => p.status === 'Delivered').length;

    return {
      success: true,
      data: purchases.map((p) => ({
        id: p.poNumber,
        dbId: p.id,
        supplier: p.supplier ? (p.supplier.company || p.supplier.name) : "Global Supplier",
        orderDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recently",
        expectedDelivery: p.expectedDelivery
          ? new Date(p.expectedDelivery).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "N/A",
        items: `${p.items ? p.items.length : 0} Items`,
        totalAmount: `$${(p.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
        status: p.status,
      })),
      stats: {
        totalOrders,
        totalValue: `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
        pendingDeliveries,
        completedOrders,
      },
    };
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return {
      success: false,
      data: [],
      stats: {
        totalOrders: 0,
        totalValue: "$0.00",
        pendingDeliveries: 0,
        completedOrders: 0,
      },
    };
  }
}

export async function createPurchase(input: Record<string, unknown>) {
  const validated = purchaseSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const company = await ensureDefaultCompany();
    const data = validated.data;

    // Verify supplier exists or find fallback supplier
    let supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      supplier = await prisma.supplier.findFirst({
        where: { companyId: company.id },
      });
    }

    if (!supplier) {
      return { success: false, error: "Supplier tidak ditemukan. Silakan tambah Supplier di halaman Suppliers terlebih dahulu." };
    }

    let totalAmount = 0;
    const itemsData = [];

    for (const item of data.items) {
      // Verify product exists
      let prod = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!prod) {
        prod = await prisma.product.findFirst({
          where: { companyId: company.id },
        });
      }

      if (!prod) {
        return { success: false, error: "Produk tidak ditemukan. Silakan buat Produk terlebih dahulu." };
      }

      const itemTotal = item.quantity * item.unitCost;
      totalAmount += itemTotal;
      itemsData.push({ productId: prod.id, quantity: item.quantity, unitCost: item.unitCost, totalCost: itemTotal });
    }

    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const purchase = await prisma.purchase.create({
      data: {
        poNumber,
        supplierId: supplier.id,
        totalAmount,
        status: (data.status as PurchaseStatus) || PurchaseStatus.Ordered,
        companyId: company.id,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    if (data.status === "Delivered") {
      for (const item of purchase.items) {
        await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await prisma.stockMovement.create({
          data: { type: "STOCK_IN", quantity: item.quantity, reference: purchase.poNumber, notes: `Purchase Order ${purchase.poNumber} Delivered`, productId: item.productId, companyId: company.id },
        });
      }
    }

    revalidatePath("/Purchases");
    revalidatePath("/Products");
    revalidatePath("/ProductInventory");
    revalidatePath("/Suppliers");
    return { success: true, data: purchase };
  } catch (error: unknown) {
    console.error("Create purchase error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create purchase order" };
  }
}

export async function updatePurchaseStatus(id: string, newStatus: "Ordered" | "Processing" | "Shipping" | "Delivered" | "Cancelled") {
  try {
    const existingPo = await prisma.purchase.findFirst({
      where: {
        OR: [{ id }, { poNumber: id }],
      },
      include: { items: true },
    });

    if (!existingPo) {
      return { success: false, error: "Purchase order not found" };
    }

    const updated = await prisma.purchase.update({
      where: { id: existingPo.id },
      data: { status: newStatus as PurchaseStatus },
    });

    if (newStatus === "Delivered" && existingPo.status !== "Delivered") {
      for (const item of existingPo.items) {
        await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await prisma.stockMovement.create({
          data: { type: "STOCK_IN", quantity: item.quantity, reference: existingPo.poNumber, notes: `Purchase Order ${existingPo.poNumber} Delivered`, productId: item.productId, companyId: existingPo.companyId },
        });
      }
    }

    revalidatePath("/Purchases");
    revalidatePath("/Products");
    revalidatePath("/ProductInventory");
    revalidatePath("/Suppliers");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Update PO status error:", error);
    return { success: false, error: "Failed to update PO status" };
  }
}
