import { UserRepository } from './user.repository.js';
import { CreateUserDto, UpdateUserDto } from './user.dto.js';
import { hashPassword } from '../../common/utils/password.util.js';
import { ConflictError, NotFoundError } from '../../common/errors/index.js';

export class UserService {
  constructor(private userRepository = new UserRepository()) {}

  async getUsers(companyId: string) {
    return this.userRepository.findAllByCompany(companyId);
  }

  async getUserById(companyId: string, id: string) {
    const user = await this.userRepository.findById(companyId, id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(companyId: string, dto: CreateUserDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = await this.userRepository.createUser(companyId, {
      fullName: dto.fullName,
      email: dto.email,
      passwordHash: hashedPassword,
      role: dto.role as any,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(companyId: string, id: string, dto: UpdateUserDto) {
    await this.getUserById(companyId, id);
    const updated = await this.userRepository.updateUser(companyId, id, dto as any);
    const { passwordHash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async deleteUser(companyId: string, id: string) {
    await this.getUserById(companyId, id);
    await this.userRepository.deleteUser(companyId, id);
    return { message: 'User deleted successfully' };
  }
}
