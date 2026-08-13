'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function getCurrentCompany() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('auth_token')?.value;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });

      if (user && user.company) {
        return {
          id: user.company.id,
          name: user.company.name,
          currency: user.company.currency || 'USD',
          taxRate: user.company.taxRate || 10,
        };
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
