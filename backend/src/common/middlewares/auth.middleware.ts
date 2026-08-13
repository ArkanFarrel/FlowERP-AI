import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request.type.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token missing or invalid');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    req.tenantContext = {
      companyId: decoded.companyId,
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to access this resource');
    }
    next();
  };
};
