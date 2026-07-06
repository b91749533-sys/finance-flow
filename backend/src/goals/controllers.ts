import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';
import { logAuditAction } from '../middlewares/audit';
import { emitToUser } from '../services/socket';
import { sendEmail } from '../services/email';

// GET /api/v1/goals
export const getGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: { goals },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/goals
export const createGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, targetAmount, currentAmount = 0, deadline } = req.body;

    if (!name || !targetAmount || !deadline) {
      return next(new AppError('Name, target amount, and deadline are required', 400));
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount),
        deadline: new Date(deadline),
      },
    });

    await logAuditAction(userId, 'GOAL_CREATE', req, { goalId: goal.id, name });

    res.status(201).json({
      status: 'success',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/goals/:id
export const updateGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, targetAmount, currentAmount, deadline, status } = req.body;

    const goalCheck = await prisma.savingsGoal.findUnique({ where: { id } });
    if (!goalCheck || goalCheck.userId !== userId) {
      return next(new AppError('Savings goal not found or access denied', 404));
    }

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(targetAmount !== undefined && { targetAmount: parseFloat(targetAmount) }),
        ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, 'GOAL_UPDATE', req, { goalId: id });

    res.status(200).json({
      status: 'success',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/goals/:id
export const deleteGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const goalCheck = await prisma.savingsGoal.findUnique({ where: { id } });
    if (!goalCheck || goalCheck.userId !== userId) {
      return next(new AppError('Savings goal not found or access denied', 404));
    }

    await prisma.savingsGoal.delete({ where: { id } });
    await logAuditAction(userId, 'GOAL_DELETE', req, { goalId: id, name: goalCheck.name });

    res.status(200).json({
      status: 'success',
      message: 'Savings goal deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/goals/:id/contribute
export const contributeToGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return next(new AppError('Please provide a valid positive contribution amount', 400));
    }

    const contribution = parseFloat(amount);

    const goal = await prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      return next(new AppError('Savings goal not found or access denied', 404));
    }

    const updatedCurrent = Number(goal.currentAmount) + contribution;
    const target = Number(goal.targetAmount);

    const updatedGoal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: updatedCurrent,
        status: updatedCurrent >= target ? 'COMPLETED' : 'ACTIVE',
      },
    });

    await logAuditAction(userId, 'GOAL_CONTRIBUTION', req, { goalId: id, amount: contribution });

    // Milestone Alert Trigger
    if (updatedCurrent >= target && Number(goal.currentAmount) < target) {
      const title = 'Savings Goal Completed! 🎉';
      const message = `Congratulations! You have successfully reached your target of $${target.toFixed(2)} for your savings goal "${goal.name}"!`;

      // 1. Save Notification
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'milestone',
          title,
          message,
        },
      });

      // 2. Emit Socket
      emitToUser(userId, 'notification', notification);

      // 3. Send Email
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { settings: true } });
      if (user && user.settings?.emailAlerts) {
        await sendEmail(
          user.email,
          'Savings Milestone Reached!',
          message,
          `<div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
            <h2 style="color: #10B981;">${title}</h2>
            <p>${message}</p>
            <p style="font-weight: bold; font-size: 16px; margin: 10px 0; color: #2563EB;">Goal Accomplished! Keep up the great savings habits!</p>
          </div>`
        );
      }
    }

    res.status(200).json({
      status: 'success',
      data: { goal: updatedGoal },
    });
  } catch (err) {
    next(err);
  }
};
export const getGoalsAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const goals = await prisma.savingsGoal.findMany({ where: { userId } });

    const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount), 0);
    const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
    const completedCount = goals.filter((g) => g.status === 'COMPLETED').length;

    res.status(200).json({
      status: 'success',
      data: {
        analytics: {
          totalGoals: goals.length,
          completedGoals: completedCount,
          totalTarget,
          totalSaved,
          progressPercent: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
