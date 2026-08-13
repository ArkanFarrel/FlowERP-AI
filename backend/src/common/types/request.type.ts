import { Request } from 'express';
import { JwtPayload } from '../utils/jwt.util.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  tenantContext?: {
    companyId: string;
    userId: string;
    role: string;
  };
}
