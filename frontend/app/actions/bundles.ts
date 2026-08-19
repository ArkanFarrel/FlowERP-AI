'use server';

import fs from 'fs/promises';
import path from 'path';
import { prisma } from "@/lib/prisma";
import { ensureDefaultCompany } from "@/lib/company";
import { revalidatePath } from "next/cache";
import crypto from 'crypto';

export interface BundleComponent {
  productId: string;
  productName: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  quantityRequired: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  bundlePrice: number;
  totalComponentCost: number;
  profitMarginPercent: number;
  maxBuildableUnits: number;
  components: BundleComponent[];
  createdAt: string;
}

const dataDir = path.join(process.cwd(), 'data');
const bundlesFile = path.join(dataDir, 'bundles.json');

async function ensureDataFile() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(bundlesFile);
    } catch {
      await fs.writeFile(bundlesFile, JSON.stringify([]));
    }
  } catch (error) {
    console.error("Failed to ensure bundles data file:", error);
  }
}

export async function getProductBundles(): Promise<{ success: boolean; data?: ProductBundle[]; error?: string }> {
  try {
    await ensureDataFile();
    const data = await fs.readFile(bundlesFile, 'utf-8');
    const bundles: ProductBundle[] = JSON.parse(data);

    // Fetch all products to get real-time stock and prices
    const company = await ensureDefaultCompany();
    const products = await prisma.product.findMany({
      where: { companyId: company.id }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Update bundles with real-time data
    const updatedBundles = bundles.map(bundle => {
      let totalComponentCost = 0;
      let maxBuildableUnits = Infinity;

      const updatedComponents = bundle.components.map(comp => {
        const product = productMap.get(comp.productId);
        const currentStock = product ? product.stock : 0;
        const costPrice = product ? product.costPrice : comp.costPrice;
        const sellingPrice = product ? product.sellingPrice : comp.sellingPrice;
        const productName = product ? product.name : comp.productName;
        const sku = product ? product.sku : comp.sku;
        
        totalComponentCost += costPrice * comp.quantityRequired;
        
        const buildableFromThisComponent = Math.floor(currentStock / comp.quantityRequired);
        if (buildableFromThisComponent < maxBuildableUnits) {
          maxBuildableUnits = buildableFromThisComponent;
        }

        return {
          ...comp,
          productName,
          sku,
          costPrice,
          sellingPrice,
          currentStock,
        };
      });

      if (maxBuildableUnits === Infinity) maxBuildableUnits = 0;

      let profitMarginPercent = 0;
      if (bundle.bundlePrice > 0 && totalComponentCost > 0) {
        profitMarginPercent = ((bundle.bundlePrice - totalComponentCost) / bundle.bundlePrice) * 100;
      }

      return {
        ...bundle,
        totalComponentCost,
        profitMarginPercent,
        maxBuildableUnits,
        components: updatedComponents
      };
    });

    return { success: true, data: updatedBundles };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching bundles:", err);
    return { success: false, error: err.message };
  }
}

export async function createProductBundle(input: {
  name: string;
  sku: string;
  description?: string;
  bundlePrice: number;
  category?: string;
  components: Array<{ productId: string; quantityRequired: number }>;
}) {
  try {
    await ensureDataFile();
    
    // Validate inputs
    if (!input.name || !input.sku || input.bundlePrice <= 0 || !input.components.length) {
      return { success: false, error: "Invalid bundle data" };
    }

    const company = await ensureDefaultCompany();
    
    // Get product details for components
    const productIds = input.components.map(c => c.productId);
    const products = await prisma.product.findMany({
      where: { 
        id: { in: productIds },
        companyId: company.id 
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));
    
    const components: BundleComponent[] = input.components.map(c => {
      const p = productMap.get(c.productId);
      if (!p) throw new Error(`Product with ID ${c.productId} not found`);
      
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.stock,
        quantityRequired: c.quantityRequired
      };
    });

    const newBundle: ProductBundle = {
      id: crypto.randomUUID(),
      name: input.name,
      sku: input.sku,
      description: input.description || "",
      category: input.category || "Bundles",
      bundlePrice: input.bundlePrice,
      totalComponentCost: 0, // Calculated dynamically on read
      profitMarginPercent: 0,
      maxBuildableUnits: 0,
      components,
      createdAt: new Date().toISOString()
    };

    const data = await fs.readFile(bundlesFile, 'utf-8');
    const bundles: ProductBundle[] = JSON.parse(data);
    
    // Check for duplicate SKU
    if (bundles.some(b => b.sku === input.sku)) {
      return { success: false, error: "Bundle with this SKU already exists" };
    }
    
    bundles.push(newBundle);
    await fs.writeFile(bundlesFile, JSON.stringify(bundles, null, 2));

    // Optionally register in Product table as well
    try {
      await prisma.product.create({
        data: {
          name: input.name,
          sku: input.sku,
          description: input.description,
          categoryName: input.category || "Bundles",
          costPrice: components.reduce((acc, c) => acc + (c.costPrice * c.quantityRequired), 0),
          sellingPrice: input.bundlePrice,
          stock: 0, // Stock is virtual for bundles unless assembled
          companyId: company.id
        }
      });
    } catch (e) {
      console.warn("Could not register bundle in products table:", e);
    }

    revalidatePath("/Bundles");
    return { success: true, data: newBundle };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error", err);
    return { success: false, error: err.message };
  }
}

export async function deleteProductBundle(id: string) {
  try {
    await ensureDataFile();
    const data = await fs.readFile(bundlesFile, 'utf-8');
    let bundles: ProductBundle[] = JSON.parse(data);
    
    const bundleToDelete = bundles.find(b => b.id === id);
    bundles = bundles.filter(b => b.id !== id);
    
    await fs.writeFile(bundlesFile, JSON.stringify(bundles, null, 2));
    
    // Also try to delete from products if registered
    if (bundleToDelete) {
      try {
        await prisma.product.delete({
          where: { sku: bundleToDelete.sku }
        });
      } catch (e) {
        // ignore
      }
    }

    revalidatePath("/Bundles");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error deleting bundle:", err);
    return { success: false, error: err.message };
  }
}

export async function processBundleSale(bundleId: string, quantitySold: number, orderRef?: string) {
  try {
    await ensureDataFile();
    const data = await fs.readFile(bundlesFile, 'utf-8');
    const bundles: ProductBundle[] = JSON.parse(data);
    const bundle = bundles.find(b => b.id === bundleId);
    
    if (!bundle) return { success: false, error: "Bundle not found" };

    const company = await ensureDefaultCompany();
    
    // Check stock first
    const products = await prisma.product.findMany({
      where: { 
        id: { in: bundle.components.map(c => c.productId) },
        companyId: company.id 
      }
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));
    
    for (const comp of bundle.components) {
      const p = productMap.get(comp.productId);
      if (!p || p.stock < (comp.quantityRequired * quantitySold)) {
        return { success: false, error: `Insufficient stock for component: ${comp.productName}` };
      }
    }

    // Process all deductions in a transaction
    await prisma.$transaction(async (tx) => {
      for (const comp of bundle.components) {
        const qtyToDeduct = comp.quantityRequired * quantitySold;
        
        await tx.product.update({
          where: { id: comp.productId },
          data: { stock: { decrement: qtyToDeduct } }
        });

        await tx.stockMovement.create({
          data: {
            type: "STOCK_OUT",
            quantity: qtyToDeduct,
            reference: orderRef || "BUNDLE_SALE",
            notes: `POS Bundle Sale: ${quantitySold}x ${bundle.name} (${comp.productName})`,
            productId: comp.productId,
            companyId: company.id
          }
        });
      }
    });

    revalidatePath("/Bundles");
    revalidatePath("/Products");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error processing bundle sale:", err);
    return { success: false, error: err.message };
  }
}

export async function assembleBundleStock(bundleId: string, quantityToAssemble: number) {
  try {
    await ensureDataFile();
    const data = await fs.readFile(bundlesFile, 'utf-8');
    const bundles: ProductBundle[] = JSON.parse(data);
    const bundle = bundles.find(b => b.id === bundleId);
    
    if (!bundle) return { success: false, error: "Bundle not found" };

    const company = await ensureDefaultCompany();
    
    // Check if the bundle exists as a real product
    const bundleProduct = await prisma.product.findUnique({
      where: { sku: bundle.sku }
    });
    
    if (!bundleProduct) {
      return { success: false, error: "Bundle must be registered as a product to assemble stock" };
    }

    // Check component stock
    const products = await prisma.product.findMany({
      where: { 
        id: { in: bundle.components.map(c => c.productId) },
        companyId: company.id 
      }
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));
    
    for (const comp of bundle.components) {
      const p = productMap.get(comp.productId);
      if (!p || p.stock < (comp.quantityRequired * quantityToAssemble)) {
        return { success: false, error: `Insufficient stock for component: ${comp.productName}` };
      }
    }

    // Process all deductions and stock in using transaction
    await prisma.$transaction(async (tx) => {
      // Deduct components
      for (const comp of bundle.components) {
        const qtyToDeduct = comp.quantityRequired * quantityToAssemble;
        
        await tx.product.update({
          where: { id: comp.productId },
          data: { stock: { decrement: qtyToDeduct } }
        });

        await tx.stockMovement.create({
          data: {
            type: "STOCK_OUT",
            quantity: qtyToDeduct,
            reference: "BUNDLE_ASSEMBLY",
            notes: `Assembly deduction for ${quantityToAssemble}x ${bundle.name}`,
            productId: comp.productId,
            companyId: company.id
          }
        });
      }
      
      // Increase bundle stock
      await tx.product.update({
        where: { id: bundleProduct.id },
        data: { stock: { increment: quantityToAssemble } }
      });
      
      await tx.stockMovement.create({
        data: {
          type: "STOCK_IN",
          quantity: quantityToAssemble,
          reference: "BUNDLE_ASSEMBLY",
          notes: `Assembled ${quantityToAssemble}x ${bundle.name}`,
          productId: bundleProduct.id,
          companyId: company.id
        }
      });
    });

    revalidatePath("/Bundles");
    revalidatePath("/Products");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error assembling bundle:", err);
    return { success: false, error: err.message };
  }
}
