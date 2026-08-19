'use server'

import { prisma } from "@/lib/prisma"
import { ensureDefaultCompany } from "@/lib/company"
import { revalidatePath } from "next/cache"

export interface ProductBatch {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  warehouse: string;
  batchNumber: string;
  lotNumber: string;
  initialQty: number;
  remainingQty: number;
  costPrice: number;
  sellingPrice: number;
  mfgDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'OUT_OF_STOCK';
  createdAt: string;
}

function calculateBatchStatus(daysUntilExpiry: number, remainingQty: number): ProductBatch['status'] {
  if (remainingQty <= 0) return 'OUT_OF_STOCK';
  if (daysUntilExpiry < 0) return 'EXPIRED';
  if (daysUntilExpiry <= 30) return 'EXPIRING_SOON';
  return 'VALID';
}

function getDaysUntilExpiry(expiryDate: string): number {
  const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// In-memory cache to hold dynamically created batches for demo purposes
// In a real app, this would be a DB table 'ProductBatch'.
const customBatches: Omit<ProductBatch, 'productName' | 'sku' | 'category' | 'daysUntilExpiry' | 'status'>[] = [];

export async function getProductBatches(): Promise<ProductBatch[]> {
  const company = await ensureDefaultCompany();
  const products = await prisma.product.findMany({
    where: { companyId: company.id },
    include: { category: true }
  });

  const batches: ProductBatch[] = [];

  // Synthesize default batches for products with positive stock
  for (const product of products) {
    if (product.stock > 0) {
      const isCustomExist = customBatches.some(b => b.productId === product.id);
      if (!isCustomExist) {
        const mfg = new Date();
        mfg.setMonth(mfg.getMonth() - 2);
        
        const exp = new Date();
        const seed = product.name.length + product.stock; 
        exp.setDate(exp.getDate() + (seed % 90) - 15); // Some might be expired
        
        const days = getDaysUntilExpiry(exp.toISOString());
        
        batches.push({
          id: `BATCH-DEF-${product.id}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.category?.name || product.categoryName,
          warehouse: product.warehouse,
          batchNumber: `BN-${product.sku}-001`,
          lotNumber: `LOT-${product.sku}-A`,
          initialQty: product.stock,
          remainingQty: product.stock,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          mfgDate: mfg.toISOString(),
          expiryDate: exp.toISOString(),
          daysUntilExpiry: days,
          status: calculateBatchStatus(days, product.stock),
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // Add custom batches
  for (const cb of customBatches) {
    const product = products.find(p => p.id === cb.productId);
    if (product) {
      const days = getDaysUntilExpiry(cb.expiryDate);
      batches.push({
        ...cb,
        productName: product.name,
        sku: product.sku,
        category: product.category?.name || product.categoryName,
        daysUntilExpiry: days,
        status: calculateBatchStatus(days, cb.remainingQty)
      });
    }
  }

  return batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
}

export async function createProductBatch(data: {
  productId: string,
  batchNumber: string,
  lotNumber: string,
  quantity: number,
  mfgDate: string,
  expiryDate: string,
  warehouse?: string,
  costPrice?: number
}) {
  const company = await ensureDefaultCompany();
  
  const product = await prisma.product.findUnique({
    where: { id: data.productId }
  });

  if (!product) throw new Error("Product not found");

  // Record Stock Movement
  await prisma.stockMovement.create({
    data: {
      type: "STOCK_IN",
      quantity: data.quantity,
      reference: `BATCH: ${data.batchNumber} | LOT: ${data.lotNumber}`,
      notes: "Batch allocation",
      warehouse: data.warehouse || product.warehouse,
      productId: product.id,
      companyId: company.id
    }
  });

  // Update product stock
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: product.stock + data.quantity }
  });

  // Add to custom batches array
  customBatches.push({
    id: `BATCH-${Date.now()}`,
    productId: product.id,
    warehouse: data.warehouse || product.warehouse,
    batchNumber: data.batchNumber,
    lotNumber: data.lotNumber,
    initialQty: data.quantity,
    remainingQty: data.quantity,
    costPrice: data.costPrice || product.costPrice,
    sellingPrice: product.sellingPrice,
    mfgDate: data.mfgDate,
    expiryDate: data.expiryDate,
    createdAt: new Date().toISOString()
  });

  revalidatePath("/Batches");
  revalidatePath("/products");
}

export async function allocateStockFIFO(productId: string, quantity: number) {
  const allBatches = await getProductBatches();
  const productBatches = allBatches.filter(b => b.productId === productId && b.remainingQty > 0);
  
  // Sort by mfgDate asc (FIFO)
  productBatches.sort((a, b) => new Date(a.mfgDate).getTime() - new Date(b.mfgDate).getTime());

  return performAllocation(productBatches, quantity);
}

export async function allocateStockFEFO(productId: string, quantity: number) {
  const allBatches = await getProductBatches();
  const productBatches = allBatches.filter(b => b.productId === productId && b.remainingQty > 0);
  
  // Sort by expiryDate asc (FEFO)
  productBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return performAllocation(productBatches, quantity);
}

function performAllocation(batches: ProductBatch[], quantity: number) {
  let remainingToAllocate = quantity;
  const allocations = [];

  for (const batch of batches) {
    if (remainingToAllocate <= 0) break;

    const allocated = Math.min(batch.remainingQty, remainingToAllocate);
    remainingToAllocate -= allocated;

    allocations.push({
      batchNumber: batch.batchNumber,
      lotNumber: batch.lotNumber,
      expiryDate: batch.expiryDate,
      allocatedQty: allocated,
      remainingInBatchAfter: batch.remainingQty - allocated
    });
  }

  return {
    success: remainingToAllocate === 0,
    requested: quantity,
    allocated: quantity - remainingToAllocate,
    shortage: remainingToAllocate,
    allocations
  };
}

export async function getExpiryAlerts() {
  const batches = await getProductBatches();
  return batches.filter(b => b.status === 'EXPIRED' || b.status === 'EXPIRING_SOON');
}

export async function getProductsForDropdown() {
  const company = await ensureDefaultCompany();
  return await prisma.product.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true, sku: true, stock: true }
  });
}

