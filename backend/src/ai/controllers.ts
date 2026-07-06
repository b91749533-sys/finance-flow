import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';
import {
  generateFinancialChat,
  getSmartBudgetRecommendations,
  detectSubscriptions,
} from '../services/ai';
import { TransactionType } from '@prisma/client';

export const handleAiChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { prompt, history = [] } = req.body;

    if (!prompt) {
      return next(new AppError('Please provide a message prompt', 400));
    }

    // 1. Gather User context
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found', 404));

    const [accounts, transactions, budgets, savingsGoals] = await prisma.$transaction([
      prisma.account.findMany({ where: { userId } }),
      prisma.transaction.findMany({
        where: { userId },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      prisma.budget.findMany({
        where: { userId },
        include: { category: { select: { name: true } } },
      }),
      prisma.savingsGoal.findMany({ where: { userId } }),
    ]);

    // 2. Call Gemini
    const reply = await generateFinancialChat(prompt, history, {
      userName: user.name,
      accounts,
      transactions,
      budgets,
      savingsGoals,
    });

    res.status(200).json({
      status: 'success',
      data: { reply },
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    // Gather statistics for recommendation engine
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found', 404));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [budgets, savingsGoals, transactions] = await prisma.$transaction([
      prisma.budget.findMany({
        where: { userId },
        include: { category: true },
      }),
      prisma.savingsGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: { gte: startOfMonth },
        },
        include: { category: true },
      }),
    ]);

    // Compute category spent aggregation
    const spendingByCategory: Record<string, number> = {};
    transactions.forEach((t) => {
      const name = t.category.name;
      spendingByCategory[name] = (spendingByCategory[name] || 0) + Number(t.amount);
    });

    const recommendations = await getSmartBudgetRecommendations(
      user.name,
      spendingByCategory,
      budgets,
      savingsGoals
    );

    res.status(200).json({
      status: 'success',
      data: { recommendations },
    });
  } catch (err) {
    next(err);
  }
};

export const handleDetectSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Fetch all transactions to look for subscriptions
    const transactions = await prisma.transaction.findMany({
      where: { userId, type: TransactionType.EXPENSE },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 100, // Look back up to 100 expenses
    });

    const detected = await detectSubscriptions(transactions);

    res.status(200).json({
      status: 'success',
      data: { subscriptions: detected },
    });
  } catch (err) {
    next(err);
  }
};
