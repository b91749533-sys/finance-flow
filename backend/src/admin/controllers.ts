import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';
import { logAuditAction } from '../middlewares/audit';

// GET /api/v1/admin/metrics
export const getSystemMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalTransactions = await prisma.transaction.count();
    
    const volumeAggregate = await prisma.transaction.aggregate({
      _sum: { amount: true },
    });
    const totalVolume = Number(volumeAggregate._sum.amount || 0);

    const activeSessions = await prisma.session.count({
      where: { isActive: true, expiresAt: { gt: new Date() } },
    });

    res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          totalUsers,
          totalTransactions,
          totalVolume,
          activeSessions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/users
export const getUsersList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        accounts: {
          select: { balance: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format to include net accounts balance
    const formattedUsers = users.map((u) => {
      const balanceSum = u.accounts.reduce((sum, a) => sum + Number(a.balance), 0);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        netBalance: balanceSum,
      };
    });

    res.status(200).json({
      status: 'success',
      data: { users: formattedUsers },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/audit-logs
export const getSystemAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 for performance
    });

    res.status(200).json({
      status: 'success',
      data: { logs },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/fraud-alerts
export const getFraudAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = [];

    // 1. Check for failed logins in the past 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: 'USER_LOGIN_FAILED',
        createdAt: { gte: yesterday },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group failed logins by IP or email
    const failedByIp: Record<string, number> = {};
    failedLogins.forEach((log) => {
      const ip = log.ipAddress || 'Unknown';
      failedByIp[ip] = (failedByIp[ip] || 0) + 1;
    });

    Object.entries(failedByIp).forEach(([ip, count]) => {
      if (count >= 5) {
        alerts.push({
          type: 'brute_force_risk',
          severity: 'high',
          message: `Suspicious activity: IP address "${ip}" failed ${count} login attempts in the last 24 hours.`,
          timestamp: new Date(),
        });
      }
    });

    // 2. Check for unusually large transactions (> $5,000)
    const largeTransactions = await prisma.transaction.findMany({
      where: {
        amount: { gte: 5000 },
        date: { gte: yesterday },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    largeTransactions.forEach((tx) => {
      alerts.push({
        type: 'large_transaction_warning',
        severity: 'medium',
        message: `Large expense flagged: User "${tx.user.name}" (${tx.user.email}) recorded an expense of $${Number(tx.amount).toFixed(2)} for "${tx.description}".`,
        timestamp: tx.date,
      });
    });

    // 3. Check for multiple active sessions (session hijacking indicator)
    const activeSessionStats = await prisma.session.groupBy({
      by: ['userId'],
      _count: { token: true },
      where: { isActive: true, expiresAt: { gt: new Date() } },
      having: {
        token: { _count: { gt: 3 } }, // Flag if more than 3 active sessions
      },
    });

    for (const stat of activeSessionStats) {
      const user = await prisma.user.findUnique({ where: { id: stat.userId } });
      if (user) {
        alerts.push({
          type: 'concurrent_sessions_warning',
          severity: 'low',
          message: `User "${user.name}" (${user.email}) currently has ${stat._count.token} active concurrent sessions.`,
          timestamp: new Date(),
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: { alerts },
    });
  } catch (err) {
    next(err);
  }
};
export const toggleAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // USER or ADMIN

    if (role !== 'USER' && role !== 'ADMIN') {
      return next(new AppError('Invalid role value. Must be USER or ADMIN.', 400));
    }

    // Guard against self-demotion
    if (id === req.user!.id) {
      return next(new AppError('You cannot change your own admin status.', 400));
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    await logAuditAction(req.user!.id, 'ADMIN_TOGGLE_ROLE', req, { targetUserId: id, newRole: role });

    res.status(200).json({
      status: 'success',
      message: `User role updated to ${role} successfully.`,
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
};
