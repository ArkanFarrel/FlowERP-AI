'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

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

const branchesDataPath = path.join(process.cwd(), 'data', 'user_branches.json');

function getUserBranchesData(): Record<string, string[]> {
  try {
    if (!fs.existsSync(path.dirname(branchesDataPath))) {
      fs.mkdirSync(path.dirname(branchesDataPath), { recursive: true });
    }
    if (fs.existsSync(branchesDataPath)) {
      const content = fs.readFileSync(branchesDataPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading user branches data:', error);
  }
  return {};
}

function saveUserBranchesData(data: Record<string, string[]>) {
  try {
    if (!fs.existsSync(path.dirname(branchesDataPath))) {
      fs.mkdirSync(path.dirname(branchesDataPath), { recursive: true });
    }
    fs.writeFileSync(branchesDataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving user branches data:', error);
  }
}

export async function getBranches(): Promise<BranchItem[]> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth_token')?.value;
  const activeBranchId = cookieStore.get('flow_active_branch_id')?.value;

  let allowedCompanyIds: string[] = [];

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (user && user.companyId) {
      const branchesData = getUserBranchesData();
      const customBranches = branchesData[userId] || [];
      allowedCompanyIds = Array.from(new Set([user.companyId, ...customBranches]));
    }
  }

  // If no user or allowed IDs found, fallback to active or first company
  let whereClause: any = {};
  if (allowedCompanyIds.length > 0) {
    whereClause = { id: { in: allowedCompanyIds } };
  } else {
    // If no logged in user, return empty list or current active
    if (activeBranchId) {
      whereClause = { id: activeBranchId };
    }
  }

  const companies = await prisma.company.findMany({
    where: whereClause,
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

  // Determine current active branch ID (must be in allowed list)
  const isCurrentValid = companies.some(c => c.id === activeBranchId);
  const currentId = isCurrentValid ? activeBranchId : companies[0].id;

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

export async function createBranch(data: { name: string; currency?: string; taxRate?: number }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth_token')?.value;

  const newCompany = await prisma.company.create({
    data: {
      name: data.name,
      currency: data.currency || 'USD',
      taxRate: data.taxRate ?? 10,
    },
  });

  // Link branch to user
  if (userId) {
    const branchesData = getUserBranchesData();
    if (!branchesData[userId]) {
      branchesData[userId] = [];
    }
    if (!branchesData[userId].includes(newCompany.id)) {
      branchesData[userId].push(newCompany.id);
    }
    saveUserBranchesData(branchesData);
  }

  // Optionally copy default categories
  const defaultCategories = ['General', 'Electronics', 'Clothing', 'Food'];
  for (const cat of defaultCategories) {
    await prisma.category.create({
      data: {
        name: cat,
        companyId: newCompany.id,
      },
    });
  }

  // Switch to new branch
  cookieStore.set('flow_active_branch_id', newCompany.id, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

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
  const userId = cookieStore.get('auth_token')?.value;
  const branchId = cookieStore.get('flow_active_branch_id')?.value;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    if (user) {
      const branchesData = getUserBranchesData();
      const allowedBranches = new Set([user.companyId, ...(branchesData[userId] || [])].filter(Boolean));

      if (branchId && allowedBranches.has(branchId)) {
        const branch = await prisma.company.findUnique({ where: { id: branchId } });
        if (branch) return branch;
      }

      if (user.company) return user.company;
    }
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
