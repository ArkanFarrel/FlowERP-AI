import { prisma } from '../../config/database.config.js';
import { Product, Prisma } from '@prisma/client';

export class ProductRepository {
  async findAllByCompany(
    companyId: string,
    params?: { search?: string; categoryId?: string; status?: string }
  ): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = { companyId };

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search } },
        { sku: { contains: params.search } },
        { barcode: { contains: params.search } },
      ];
    }

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.status) {
      where.status = params.status as any;
    }

    return prisma.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { id, companyId },
      include: { category: true, supplier: true },
    });
  }

  async findBySku(companyId: string, sku: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { companyId, sku },
    });
  }

  async create(companyId: string, data: any): Promise<Product> {
    return prisma.product.create({
      data: {
        companyId,
        ...data,
      },
    });
  }

  async update(companyId: string, id: string, data: any): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(companyId: string, id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
    });
  }
}
