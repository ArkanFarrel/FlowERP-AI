'use server';

import { prisma } from "@/lib/prisma";
import { stockMovementSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

async function ensureDefaultCompany() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: { name: "FlowERP Store", currency: "USD", taxRate: 10 },
    });
  }
  return company;
}

export async function getInventory() {
  try {
    const company = await ensureDefaultCompany();
    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: products.map((p) => ({
        id: p.id,
        product: p.name,
        sku: p.sku,
        category: p.categoryName,
        warehouse: p.warehouse || "Central Store",
        stock: p.stock,
        reserved: 0,
        available: p.stock,
        cost: `$${p.costPrice.toFixed(2)}`,
        price: `$${p.sellingPrice.toFixed(2)}`,
        status: (p.stock === 0 ? "Out of Stock" : p.stock <= 15 ? "Low Stock" : "In Stock") as "Out of Stock" | "Low Stock" | "In Stock",
        updated: "Just now",
      })),
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return {
      success: true,
      data: [],
    };
  }
}

export async function getStockMovements() {
  try {
    const company = await ensureDefaultCompany();
    const movements = await prisma.stockMovement.findMany({
      where: { companyId: company.id },
      include: { product: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (movements.length > 0) {
      return {
        success: true,
        data: movements.map((sm) => ({
          id: sm.id,
          type: sm.type === "STOCK_IN" ? "Stock In" : sm.type === "STOCK_OUT" ? "Stock Out" : "Stock Adjustment",
          rawType: sm.type,
          product: sm.product?.name || "Product Item",
          quantity: `${sm.type === "STOCK_IN" ? "+" : sm.type === "STOCK_OUT" ? "-" : ""}${sm.quantity}`,
          warehouse: sm.warehouse || "Central Store",
          time: new Date(sm.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          user: sm.createdBy?.name || "System Admin",
        })),
      };
    }
  } catch (error) {
    console.warn("Error fetching stock movements from DB:", error);
  }

  try {
    const company = await ensureDefaultCompany();
    const recentProducts = await prisma.product.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      success: true,
      data: recentProducts.map((p) => ({
        id: `created-${p.id}`,
        type: "Stock In",
        rawType: "STOCK_IN",
        product: p.name,
        quantity: `+${p.stock}`,
        warehouse: p.warehouse || "Central Store",
        time: new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        user: "Admin",
      })),
    };
  } catch {
    return { success: true, data: [] };
  }
}

export async function createStockAdjustment(input: Record<string, unknown>) {
  const validated = stockMovementSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const company = await ensureDefaultCompany();
    const data = validated.data;

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    let delta = data.quantity;
    if (data.type === "STOCK_OUT") {
      delta = -Math.abs(data.quantity);
    } else if (data.type === "ADJUSTMENT") {
      delta = data.quantity - product.stock;
    }

    const newStock = product.stock + delta;
    if (newStock < 0 && !product.allowNegativeStock) {
      return { success: false, error: "Stock cannot be negative" };
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        stock: newStock,
        status: newStock === 0 ? "Out of Stock" : newStock <= 15 ? "Low Stock" : "Active",
      },
    });

    const movement = await prisma.stockMovement.create({
      data: {
        type: data.type,
        quantity: Math.abs(delta),
        notes: data.notes || "Manual stock adjustment",
        warehouse: data.warehouse,
        productId: product.id,
        companyId: company.id,
      },
    });

    revalidatePath("/ProductInventory");
    revalidatePath("/Products");
    revalidatePath("/Dashboard");
    return { success: true, data: movement };
  } catch (error) {
    console.error("Create stock movement error:", error);
    return { success: false, error: "Failed to record stock adjustment" };
  }
}

export interface TransferStockInput {
  productId: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  quantity: number;
  notes?: string;
}

/**
 * Memindahkan stok antar gudang (Multi-Warehouse Transfer) & menerbitkan Nomor Surat Jalan Pemindahan.
 */
export async function transferStockBetweenWarehouses(input: TransferStockInput) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const company = await ensureDefaultCompany();

    if (!input.productId || !input.sourceWarehouse || !input.targetWarehouse || !input.quantity) {
      return { success: false, error: "Gudang Asal, Gudang Tujuan, Produk, dan Jumlah Transfer wajib diisi." };
    }

    if (input.sourceWarehouse === input.targetWarehouse) {
      return { success: false, error: "Gudang Asal dan Gudang Tujuan tidak boleh sama." };
    }

    const transferQty = Number(input.quantity);
    if (isNaN(transferQty) || transferQty <= 0) {
      return { success: false, error: "Jumlah transfer stok harus lebih dari 0." };
    }

    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) {
      return { success: false, error: "Produk tidak ditemukan di sistem." };
    }

    if (product.stock < transferQty && !product.allowNegativeStock) {
      return { success: false, error: `Stok produk (${product.stock} pcs) tidak mencukupi untuk ditransfer sebanyak ${transferQty} pcs.` };
    }

    // Nomor Surat Jalan Pemindahan Stok unik
    const waybillNumber = `SJ-WH-${Date.now().toString().slice(-6)}`;

    // Catat pergerakan stok keluar dari Gudang Asal
    await prisma.stockMovement.create({
      data: {
        type: "TRANSFER",
        quantity: transferQty,
        warehouse: input.sourceWarehouse,
        reference: waybillNumber,
        notes: `Transfer Keluar dari ${input.sourceWarehouse} ke ${input.targetWarehouse}. Surat Jalan: ${waybillNumber}. ${input.notes || ''}`,
        productId: product.id,
        companyId: company.id,
      },
    });

    // Catat pergerakan stok masuk ke Gudang Tujuan & update lokasi gudang utama produk jika diperlukan
    await prisma.stockMovement.create({
      data: {
        type: "STOCK_IN",
        quantity: transferQty,
        warehouse: input.targetWarehouse,
        reference: waybillNumber,
        notes: `Transfer Masuk dari ${input.sourceWarehouse} via Surat Jalan: ${waybillNumber}`,
        productId: product.id,
        companyId: company.id,
      },
    });

    // Update lokasi gudang aktif produk
    await prisma.product.update({
      where: { id: product.id },
      data: {
        warehouse: input.targetWarehouse,
      },
    });

    revalidatePath("/ProductInventory");
    revalidatePath("/Products");
    revalidatePath("/Dashboard");
    revalidatePath("/AI-Insights");

    return {
      success: true,
      waybillNumber,
      message: `Berhasil mentransfer ${transferQty} pcs ${product.name} dari ${input.sourceWarehouse} ke ${input.targetWarehouse}. Surat Jalan: ${waybillNumber}`,
      details: {
        waybillNumber,
        productName: product.name,
        sku: product.sku,
        quantity: transferQty,
        sourceWarehouse: input.sourceWarehouse,
        targetWarehouse: input.targetWarehouse,
        date: new Date().toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' }),
      }
    };
  } catch (error: unknown) {
    console.error("transferStockBetweenWarehouses error:", error);
    const msg = error instanceof Error ? error.message : "Gagal mentransfer stok antar gudang.";
    return { success: false, error: msg };
  }
}
