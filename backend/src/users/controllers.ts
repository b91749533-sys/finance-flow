import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';
import { logAuditAction } from '../middlewares/audit';

// Profile operations
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, email } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }), // Note: in real prod, email change requires re-verification
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    await logAuditAction(userId, 'USER_UPDATE_PROFILE', req, { updatedFields: { name, email } });

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// Accounts operations
export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: { accounts },
    });
  } catch (err) {
    next(err);
  }
};

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, type, balance, currency } = req.body;

    if (!name || !type || balance === undefined) {
      return next(new AppError('Please provide name, type, and balance', 400));
    }

    const account = await prisma.account.create({
      data: {
        userId,
        name,
        type,
        balance,
        currency: currency || 'USD',
      },
    });

    await logAuditAction(userId, 'ACCOUNT_CREATE', req, { accountId: account.id, name });

    res.status(201).json({
      status: 'success',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, type, balance, currency } = req.body;

    // Verify ownership
    const accountCheck = await prisma.account.findUnique({ where: { id } });
    if (!accountCheck || accountCheck.userId !== userId) {
      return next(new AppError('Account not found or access denied', 404));
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(balance !== undefined && { balance }),
        ...(currency && { currency }),
      },
    });

    await logAuditAction(userId, 'ACCOUNT_UPDATE', req, { accountId: id });

    res.status(200).json({
      status: 'success',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify ownership
    const accountCheck = await prisma.account.findUnique({ where: { id } });
    if (!accountCheck || accountCheck.userId !== userId) {
      return next(new AppError('Account not found or access denied', 404));
    }

    await prisma.account.delete({ where: { id } });
    await logAuditAction(userId, 'ACCOUNT_DELETE', req, { accountId: id, name: accountCheck.name });

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// Settings operations
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const settings = await prisma.settings.findUnique({
      where: { userId },
    });

    res.status(200).json({
      status: 'success',
      data: { settings },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { theme, currency, notificationsEnabled, emailAlerts, twoFactorEnabled } = req.body;

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        ...(theme && { theme }),
        ...(currency && { currency }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
        ...(emailAlerts !== undefined && { emailAlerts }),
        ...(twoFactorEnabled !== undefined && { twoFactorEnabled }),
      },
      create: {
        userId,
        theme: theme || 'light',
        currency: currency || 'USD',
        notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true,
        emailAlerts: emailAlerts !== undefined ? emailAlerts : true,
        twoFactorEnabled: twoFactorEnabled !== undefined ? twoFactorEnabled : false,
      },
    });

    await logAuditAction(userId, 'SETTINGS_UPDATE', req);

    res.status(200).json({
      status: 'success',
      data: { settings },
    });
  } catch (err) {
    next(err);
  }
};
