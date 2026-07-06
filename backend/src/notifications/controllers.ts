import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { notifications },
    });
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read.',
      });
    }

    const check = await prisma.notification.findUnique({ where: { id } });
    if (!check || check.userId !== userId) {
      return next(new AppError('Notification not found', 404));
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const check = await prisma.notification.findUnique({ where: { id } });
    if (!check || check.userId !== userId) {
      return next(new AppError('Notification not found', 404));
    }

    await prisma.notification.delete({ where: { id } });

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
