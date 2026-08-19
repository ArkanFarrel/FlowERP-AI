'use server';

import { prisma } from "@/lib/prisma";
import { ensureDefaultCompany } from "@/lib/company";
import { revalidatePath } from "next/cache";

export interface OpnameProduct {
  id: string;
  name: string;
  sku: string;
  warehouse: string;
  categoryName: string;
  stock: number;
}

export async function getAllProductsForOpname(): Promise<{ success: boolean; data: OpnameProduct[] }> {
  try {
    const company = await ensureDefaultCompany();
    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true, sku: true, warehouse: true, categoryName: true, stock: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: products.map(p => ({ ...p, warehouse: p.warehouse || 'Central Store' })) };
  } catch (error) {
    console.error('getAllProductsForOpname error:', error);
    return { success: false, data: [] };
  }
}

export interface OpnameItem {
  productId: string;
  systemStock: number;
  physicalCount: number;
  notes?: string;
}

export async function createStockOpname(
  items: OpnameItem[]
): Promise<{ success: boolean; opnameId?: string; totalAdjusted?: number; error?: string }> {
  try {
    const company = await ensureDefaultCompany();
    const opnameId = `OPN-${Math.floor(10000 + Math.random() * 90000)}`;
    let totalAdjusted = 0;
    const itemsWithDiff = items.filter(i => i.physicalCount !== i.systemStock);
    for (const item of itemsWithDiff) {
      const diff = item.physicalCount - item.systemStock;
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: item.physicalCount,
          status: item.physicalCount === 0 ? 'Out of Stock' : item.physicalCount <= 15 ? 'Low Stock' : 'Active',
        },
      });
      await prisma.stockMovement.create({
        data: {
          type: 'ADJUSTMENT',
          quantity: Math.abs(diff),
          notes: `Stock Opname ${opnameId}. Sistem: ${item.systemStock}, Fisik: ${item.physicalCount}. Selisih: ${diff > 0 ? '+' : ''}${diff}. ${item.notes || ''}`,
          reference: opnameId,
          productId: item.productId,
          companyId: company.id,
        },
      });
      totalAdjusted++;
    }
    revalidatePath('/ProductInventory');
    revalidatePath('/Products');
    revalidatePath('/Dashboard');
    return { success: true, opnameId, totalAdjusted };
  } catch (error) {
    console.error('createStockOpname error:', error);
    return { success: false, error: 'Gagal menyimpan data stock opname' };
  }
}
