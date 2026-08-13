import { prisma } from '../../config/database.config.js';
import { Supplier } from '@prisma/client';

export class SupplierRepository {
  async findAllByCompany(companyId: string, search?: string): Promise<Supplier[]> {
    return prisma.supplier.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { companyName: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { products: true, purchases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string): Promise<Supplier | null> {
    return prisma.supplier.findFirst({
      where: { id, companyId },
      include: { products: true, purchases: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  async create(companyId: string, data: any): Promise<Supplier> {
    return prisma.supplier.create({
      data: {
        companyId,
        ...data,
      },
    });
  }

  async update(companyId: string, id: string, data: any): Promise<Supplier> {
    return prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async delete(companyId: string, id: string): Promise<Supplier> {
    return prisma.supplier.delete({
      where: { id },
    });
  }
}
