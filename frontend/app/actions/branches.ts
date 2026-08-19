'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export interface BranchItem {
  id: string;
  name: string;
  logo?: string | null;
  taxRate: number;
  currency: string;
  productCount: number;
  userCount: number;
  salesCount: number;
  totalRevenue: number;
  isCurrent: boolean;
  createdAt: string;
}

export async function getBranches(): Promise<BranchItem[]> {
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get('flow_active_branch_id')?.value;

  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: {
          products: true,
          users: true,
          sales: true,
        },
      },
      sales: {
        select: {
          total: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (companies.length === 0) return [];

  const currentId = activeBranchId || companies[0].id;

  return companies.map(c => {
    const totalRevenue = c.sales.reduce((sum, s) => sum + s.total, 0);

    return {
      id: c.id,
      name: c.name,
      logo: c.logo,
      taxRate: c.taxRate,
      currency: c.currency,
      productCount: c._count.products,
      userCount: c._count.users,
      salesCount: c._count.sales,
      totalRevenue,
      isCurrent: c.id === currentId,
      createdAt: c.createdAt.toISOString(),
    };
  });
}

export async function createBranch(data: { name: string, currency?: string, taxRate?: number }) {
  const newCompany = await prisma.company.create({
    data: {
      name: data.name,
      currency: data.currency || 'USD',
      taxRate: data.taxRate ?? 10,
    },
  });
  
  // optionally copy default categories
  const defaultCategories = ['General', 'Electronics', 'Clothing', 'Food'];
  for (const cat of defaultCategories) {
    await prisma.category.create({
      data: {
        name: cat,
        companyId: newCompany.id,
      }
    });
  }

  return newCompany;
}

export async function switchBranch(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set('flow_active_branch_id', branchId, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return { success: true };
}

export async function getActiveBranch() {
  const cookieStore = await cookies();
  const branchId = cookieStore.get('flow_active_branch_id')?.value;

  if (branchId) {
    const branch = await prisma.company.findUnique({ where: { id: branchId } });
    if (branch) return branch;
  }

  return prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
}

export async function getConsolidatedSummary() {
  const branches = await getBranches();
  
  const totalRevenue = branches.reduce((sum, b) => sum + b.totalRevenue, 0);
  const totalProducts = branches.reduce((sum, b) => sum + b.productCount, 0);
  const totalUsers = branches.reduce((sum, b) => sum + b.userCount, 0);
  const totalSalesCount = branches.reduce((sum, b) => sum + b.salesCount, 0);

  return {
    summary: {
      totalRevenue,
      totalProducts,
      totalUsers,
      totalSalesCount,
    },
    breakdown: branches,
  };
}
