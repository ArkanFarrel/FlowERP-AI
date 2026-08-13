'use server';

// Trigger Next.js HMR refresh with direct TCP Prisma instance
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-api";
import { ensureDefaultCompany } from "@/lib/company";

import { cookies } from "next/headers";
import { getCurrentUserProfile } from "@/app/actions/auth";

interface BackendProduct {
  id: string;
  sku: string;
  name: string;
  stock: number;
  minStock?: number;
  sellingPrice: number | string;
  costPrice?: number | string;
  unit?: string;
  warehouse?: string;
  image?: string;
  category?: { name?: string };
  categoryName?: string;
}

async function getUserRole(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieRole = cookieStore.get("user_role")?.value;
    if (cookieRole) return cookieRole.toUpperCase();

    const profile = await getCurrentUserProfile();
    if (profile.success && profile.user?.role) {
      return profile.user.role.toUpperCase();
    }
  } catch (err) {
    console.warn("getUserRole fallback:", err);
  }
  return "STAFF";
}

export async function getProducts() {
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
        sku: p.sku,
        name: p.name,
        category: p.categoryName || 'Hardware',
        warehouse: p.warehouse || 'Central Store',
        stock: p.stock,
        minStock: p.minStock,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        price: `$${p.sellingPrice.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
        status: p.stock === 0 ? "Out of Stock" : p.stock <= 15 ? "Low Stock" : "Active",
        image: p.image || p.name,
      })),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    try {
      const res = await backendFetch<BackendProduct[]>('/products');
      if (res.success && res.data) {
        return {
          success: true,
          data: res.data.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category?.name || p.categoryName || 'Hardware',
            warehouse: p.warehouse || 'Central Store',
            stock: p.stock,
            minStock: p.minStock || 15,
            costPrice: Number(p.costPrice) || 0,
            sellingPrice: Number(p.sellingPrice) || 0,
            price: `$${Number(p.sellingPrice).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
            status: p.stock === 0 ? "Out of Stock" : p.stock <= 15 ? "Low Stock" : "Active",
            image: p.image || p.name,
          })),
        };
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      data: [],
    };
  }
}

export async function createProduct(input: Record<string, unknown>) {
  const role = await getUserRole();
  const allowedRoles = ["OWNER", "ADMIN", "MANAGER", "WAREHOUSE"];
  if (!allowedRoles.includes(role)) {
    return { success: false, error: "Akses Ditolak: Peran (Role) Anda tidak memiliki izin untuk menambah produk." };
  }

  const validated = productSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const company = await ensureDefaultCompany();
    const data = validated.data;

    const newProduct = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        categoryName: data.categoryName || "General",
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stock: data.stock,
        minStock: data.minStock ?? 5,
        maxStock: data.maxStock ?? 100,
        unit: data.unit ?? "pcs",
        warehouse: data.warehouse ?? "Central Store",
        status: data.status ?? "Active",
        companyId: company.id,
      },
    });

    try {
      revalidatePath("/Products");
      revalidatePath("/ProductInventory");
      revalidatePath("/Dashboard");
    } catch {
      // ignore revalidatePath errors outside Next.js request lifecycle
    }
    return { success: true, data: newProduct };
  } catch (error: unknown) {
    console.error("Create product error:", error);
    const errObj = error as { code?: string; message?: string };
    if (errObj?.code === 'P2002') {
      return { success: false, error: "Produk dengan SKU ini sudah ada. Silakan gunakan SKU yang unik." };
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to create product" };
  }
}

export async function updateProduct(id: string, input: Record<string, unknown>) {
  const role = await getUserRole();
  const allowedRoles = ["OWNER", "ADMIN", "MANAGER", "WAREHOUSE"];
  if (!allowedRoles.includes(role)) {
    return { success: false, error: "Akses Ditolak: Peran (Role) Anda tidak memiliki izin untuk mengubah produk." };
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: input.name as string,
        sku: input.sku as string,
        categoryName: input.categoryName as string,
        costPrice: Number(input.costPrice) || 0,
        sellingPrice: Number(input.sellingPrice) || 0,
        stock: Number(input.stock) || 0,
        warehouse: (input.warehouse as string) || "Central Store",
      },
    });

    revalidatePath("/Products");
    revalidatePath("/ProductInventory");
    revalidatePath("/Dashboard");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Update product error:", error);
    return { success: false, error: "Failed to update product" };
  }
}

export async function deleteProduct(id: string) {
  const role = await getUserRole();
  const allowedRoles = ["OWNER", "ADMIN", "MANAGER"];
  if (!allowedRoles.includes(role)) {
    return { success: false, error: "Akses Ditolak: Peran (Role) Anda tidak memiliki izin untuk menghapus produk dari katalog." };
  }

  try {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/Products");
    revalidatePath("/ProductInventory");
    revalidatePath("/Dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete product error:", error);
    return { success: false, error: "Gagal menghapus produk dari database." };
  }
}
