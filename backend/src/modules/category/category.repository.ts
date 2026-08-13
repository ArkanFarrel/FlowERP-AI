import { prisma } from '../../config/database.config.js';
import { Category } from '@prisma/client';

export class CategoryRepository {
  async findAllByCompany(companyId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: { companyId },
      include: { _count: { select: { products: true } } },
    });
  }

  async findById(companyId: string, id: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { id, companyId },
    });
  }

  async create(companyId: string, data: { name: string; description?: string }): Promise<Category> {
    return prisma.category.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
      },
    });
  }

  async update(companyId: string, id: string, data: { name?: string; description?: string }): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(companyId: string, id: string): Promise<Category> {
    return prisma.category.delete({
      where: { id },
    });
  }
}
