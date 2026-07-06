import { Request } from 'express';
import { prisma } from '../database';

export const logAuditAction = async (
  userId: string | null,
  action: string,
  req?: Request,
  details?: Record<string, any>
) => {
  try {
    const ipAddress = req ? (req.ip || req.socket.remoteAddress || null) : null;
    const userAgent = req ? (req.headers['user-agent'] || null) : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        ipAddress,
        userAgent,
        details: details || {},
      },
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};
