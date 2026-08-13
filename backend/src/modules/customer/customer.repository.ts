import { prisma } from '../../config/database.config.js';
import { Customer } from '@prisma/client';

export class CustomerRepository {
  async findAllByCompany(companyId: string, search?: string): Promise<Customer[]> {
    return prisma.customer.findMany({
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
        _count: { select: { salesOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        salesOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async create(companyId: string, data: any): Promise<Customer> {
    return prisma.customer.create({
      data: {
        companyId,
        ...data,
      },
    });
  }

  async update(companyId: string, id: string, data: any): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data,
    });
  }

  async delete(companyId: string, id: string): Promise<Customer> {
    return prisma.customer.delete({
      where: { id },
    });
  }
}
