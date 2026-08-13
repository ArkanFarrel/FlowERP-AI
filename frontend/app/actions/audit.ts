'use server';

import { prisma } from '@/lib/prisma';

interface LogAuditParams {
  companyId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}

/**
 * Server Action: Pencatat Audit Log otomatis untuk pelacakan aktivitas penting pengguna & sistem ERP.
 */
export async function logAuditAction(params: LogAuditParams) {
  try {
    const detailsString = typeof params.details === 'object' 
      ? JSON.stringify(params.details) 
      : params.details;

    await (prisma as any).auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: detailsString,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error('Gagal menyimpan AuditLog:', error);
  }
}
