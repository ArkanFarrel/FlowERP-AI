'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const branchesDataPath = path.join(process.cwd(), 'data', 'user_branches.json');

function getUserBranchesData(): Record<string, string[]> {
  try {
    if (fs.existsSync(branchesDataPath)) {
      const content = fs.readFileSync(branchesDataPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  return {};
}

export async function getCurrentCompany() {
  try {
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

        // Only allow branchId if it strictly belongs to this user
        if (branchId && allowedBranches.has(branchId)) {
          const branch = await prisma.company.findUnique({ where: { id: branchId } });
          if (branch) {
            return {
              id: branch.id,
              name: branch.name,
              currency: branch.currency || 'USD',
              taxRate: branch.taxRate || 10,
            };
          }
        }

        if (user.company) {
          return {
            id: user.company.id,
            name: user.company.name,
            currency: user.company.currency || 'USD',
            taxRate: user.company.taxRate || 10,
          };
        }
      }
    }
  } catch (err) {
    console.warn("getCurrentCompany cookie/user lookup note:", err instanceof Error ? err.message : String(err));
  }

  let company = await prisma.company.findFirst({
    select: { id: true, name: true, currency: true, taxRate: true },
  }).catch(() => null);

  if (!company) {
    try {
      company = await prisma.company.create({
        data: { name: 'FlowERP Store', currency: 'USD', taxRate: 10 },
        select: { id: true, name: true, currency: true, taxRate: true },
      });
    } catch {
      company = await prisma.company.findFirst({
        select: { id: true, name: true, currency: true, taxRate: true },
      }).catch(() => null);
    }
  }

  if (company) {
    return company;
  }

  return { id: 'default-company-id', name: 'FlowERP Store', currency: 'USD', taxRate: 10 };
}

export async function ensureDefaultCompany() {
  return getCurrentCompany();
}
