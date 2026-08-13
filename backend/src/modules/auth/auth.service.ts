import { AuthRepository } from './auth.repository.js';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto.js';
import { hashPassword, comparePassword } from '../../common/utils/password.util.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../common/utils/jwt.util.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../common/errors/index.js';
import { logger } from '../../config/logger.config.js';

export class AuthService {
  constructor(private authRepository = new AuthRepository()) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.authRepository.findUserByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(dto.password);
    const { user, company } = await this.authRepository.createTenantAndOwner({
      fullName: dto.name,
      email: dto.email,
      passwordHash,
      companyName: dto.companyName,
    });

    const payload = {
      userId: user.id,
      companyId: company.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      company: {
        id: company.id,
        name: company.name,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials or account disabled');
    }

    const isValidPassword = await comparePassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const payload = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const decoded = verifyRefreshToken(dto.refreshToken);
      const user = await this.authRepository.findUserById(decoded.userId);

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User account not found or deactivated');
      }

      const payload = {
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        email: user.email,
      };

      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user) {
      return { message: 'If the email exists, a password reset link has been dispatched.' };
    }

    const resetToken = generateAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    });

    logger.info(`🔑 Password reset token generated for ${user.email}: ${resetToken}`);
    return { message: 'If the email exists, a password reset link has been dispatched.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const decoded = verifyRefreshToken(dto.token);
      const user = await this.authRepository.findUserById(decoded.userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const newPasswordHash = await hashPassword(dto.newPassword);
      await this.authRepository.updateUserPassword(user.id, newPasswordHash);

      return { message: 'Password has been successfully reset.' };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired password reset token');
    }
  }
}
