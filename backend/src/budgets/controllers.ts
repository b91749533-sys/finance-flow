import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';
import { logAuditAction } from '../middlewares/audit';
import { TransactionType } from '@prisma/client';

// GET /api/v1/budgets
export const getBudgets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Fetch active budgets
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: { category: { name: 'asc' } },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    // Compute spent amount for each budget in current month
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (b) => {
        const spentAggregate = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: b.categoryId,
            type: TransactionType.EXPENSE,
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: { amount: true },
        });

        return {
          ...b,
          currentSpent: Number(spentAggregate._sum.amount || 0),
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: { budgets: budgetsWithSpent },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/budgets
export const createBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { categoryId, amountLimit, period = 'monthly', startDate, endDate } = req.body;

    if (!categoryId || !amountLimit) {
      return next(new AppError('Category and amount limit are required', 400));
    }

    const limit = parseFloat(amountLimit);
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

    // Verify category exists
    const category = await prisma.category.findFirst({
      where: { id: categoryId, OR: [{ userId }, { userId: null }] },
    });

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    // Check unique budget constraint
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId,
        startDate: start,
      },
    });

    if (existingBudget) {
      return next(new AppError('A budget for this category and month already exists.', 400));
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId,
        amountLimit: limit,
        period,
        startDate: start,
        endDate: end,
      },
    });

    await logAuditAction(userId, 'BUDGET_CREATE', req, { budgetId: budget.id, categoryId, amountLimit: limit });

    res.status(201).json({
      status: 'success',
      data: { budget },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/budgets/:id
export const updateBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { amountLimit, period, startDate, endDate } = req.body;

    // Verify ownership
    const budgetCheck = await prisma.budget.findUnique({ where: { id } });
    if (!budgetCheck || budgetCheck.userId !== userId) {
      return next(new AppError('Budget not found or access denied', 404));
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(amountLimit !== undefined && { amountLimit: parseFloat(amountLimit) }),
        ...(period && { period }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    await logAuditAction(userId, 'BUDGET_UPDATE', req, { budgetId: id });

    res.status(200).json({
      status: 'success',
      data: { budget },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/budgets/:id
export const deleteBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify ownership
    const budgetCheck = await prisma.budget.findUnique({ where: { id } });
    if (!budgetCheck || budgetCheck.userId !== userId) {
      return next(new AppError('Budget not found or access denied', 404));
    }

    await prisma.budget.delete({ where: { id } });
    await logAuditAction(userId, 'BUDGET_DELETE', req, { budgetId: id });

    res.status(200).json({
      status: 'success',
      message: 'Budget deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/budgets/trends
export const getBudgetTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const trends = [];
    const now = new Date();

    // Query past 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: '2-digit' });

      // Total Budgeted in that month
      const budgets = await prisma.budget.findMany({
        where: {
          userId,
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart },
        },
      });
      const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.amountLimit), 0);

      // Total Spent in that month
      const spentAggregate = await prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      });
      const totalSpent = Number(spentAggregate._sum.amount || 0);

      trends.push({
        month: monthLabel,
        budgeted: totalBudgeted,
        spent: totalSpent,
      });
    }

    res.status(200).json({
      status: 'success',
      data: { trends },
    });
  } catch (err) {
    next(err);
  }
};
