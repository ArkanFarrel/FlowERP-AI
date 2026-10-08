import { prisma } from '../../config/database.config.js';
import { User, Company } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  }

  async createTenantAndOwner(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    companyName: string;
  }): Promise<{ user: User; company: Company }> {
    const company = await prisma.company.create({
      data: {
        name: data.companyName,
      },
    });

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash: data.passwordHash,
        companyId: company.id,
        role: 'OWNER',
      },
    });

    return { user, company };
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
};
