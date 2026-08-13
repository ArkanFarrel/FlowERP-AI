import { prisma } from '../../config/database.config.js';
import { User, Role } from '@prisma/client';

export class UserRepository {
  async findAllByCompany(companyId: string): Promise<Omit<User, 'passwordHash'>[]> {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        companyId: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(companyId: string, id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, companyId },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(companyId: string, data: { fullName: string; email: string; passwordHash: string; role: Role }): Promise<User> {
    return prisma.user.create({
      data: {
        companyId,
        fullName: data.fullName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });
  }

  async updateUser(companyId: string, id: string, data: Partial<{ fullName: string; role: Role; isActive: boolean }>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(companyId: string, id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}
