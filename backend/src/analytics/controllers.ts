import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { TransactionType } from '@prisma/client';

// GET /api/v1/analytics/overview
export const getOverviewStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // 1. Fetch Accounts
    const accounts = await prisma.account.findMany({ where: { userId } });
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    accounts.forEach((a) => {
      const balance = Number(a.balance);
      if (a.type === 'CREDIT') {
        totalLiabilities += balance; // Credit cards are liabilities
      } else {
        totalAssets += balance;
      }
    });

    const netWorth = totalAssets - totalLiabilities;
    const currentBalance = totalAssets; // Cash/Assets

    // 2. Fetch current month's income and expenses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    transactions.forEach((t) => {
      const amount = Number(t.amount);
      if (t.type === TransactionType.INCOME) {
        monthlyIncome += amount;
      } else if (t.type === TransactionType.EXPENSE) {
        monthlyExpenses += amount;
      }
    });

    // 3. Savings Rate
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

    // 4. Budget Status
    const budgets = await prisma.budget.findMany({ where: { userId } });
    const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.amountLimit), 0);

    // 5. Recent 5 Transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        category: { select: { name: true, icon: true, color: true } },
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    // 6. Upcoming Bills (Subscriptions coming up in next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const upcomingBills = await prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
        nextBillingDate: { gte: new Date(), lte: next7Days },
      },
      orderBy: { nextBillingDate: 'asc' },
    });

    // 6.5. Fetch Today's stats
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfToday, lte: endOfToday },
      },
    });

    let todaySpent = 0;
    let todayEarned = 0;

    todayTransactions.forEach((t) => {
      const amount = Number(t.amount);
      if (t.type === TransactionType.INCOME) {
        todayEarned += amount;
      } else if (t.type === TransactionType.EXPENSE) {
        todaySpent += amount;
      }
    });

    // 7. Financial Score (0 - 100 Index)
    // Savings Rate (40%), Budget Adherence (40%), Savings Goal Completion (20%)
    let budgetAdherenceScore = 100;
    if (totalBudgeted > 0 && monthlyExpenses > totalBudgeted) {
      const overspendRatio = monthlyExpenses / totalBudgeted;
      budgetAdherenceScore = Math.max(0, 100 - (overspendRatio - 1) * 100);
    }
    const savingsRateScore = Math.min(100, Math.max(0, savingsRate * 2.5)); // 40% savings rate = 100 score
    
    const goals = await prisma.savingsGoal.findMany({ where: { userId } });
    const activeGoalsTotal = goals.reduce((sum, g) => sum + Number(g.targetAmount), 0);
    const activeGoalsSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
    const goalsCompletionScore = activeGoalsTotal > 0 ? (activeGoalsSaved / activeGoalsTotal) * 100 : 100;

    const financialScore = Math.round(
      savingsRateScore * 0.4 + budgetAdherenceScore * 0.4 + goalsCompletionScore * 0.2
    );

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          currentBalance,
          monthlyIncome,
          monthlyExpenses,
          savingsRate,
          netWorth,
          totalBudgeted,
          financialScore: Math.min(100, Math.max(10, financialScore)),
          recentTransactions,
          upcomingBills,
          todaySpent,
          todayEarned,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/breakdown
export const getSpendBreakdown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Group expenses by category
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: startOfMonth },
      },
      include: {
        category: true,
      },
    });

    const categoryBreakdown: Record<string, { name: string; amount: number; color: string; icon: string }> = {};
    let totalExpense = 0;

    transactions.forEach((t) => {
      const amount = Number(t.amount);
      totalExpense += amount;

      const catId = t.categoryId;
      if (categoryBreakdown[catId]) {
        categoryBreakdown[catId].amount += amount;
      } else {
        categoryBreakdown[catId] = {
          name: t.category.name,
          amount,
          color: t.category.color,
          icon: t.category.icon,
        };
      }
    });

    const breakdownArray = Object.values(categoryBreakdown).map((item) => ({
      ...item,
      percentage: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        breakdown: breakdownArray,
        totalExpense,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/cash-flow
export const getCashFlow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const cashFlow = [];
    const now = new Date();

    // Past 6 months cash flow
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = monthStart.toLocaleString('default', { month: 'short' });

      const txs = await prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      let income = 0;
      let expenses = 0;

      txs.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === TransactionType.INCOME) {
          income += amount;
        } else if (t.type === TransactionType.EXPENSE) {
          expenses += amount;
        }
      });

      cashFlow.push({
        month: monthLabel,
        income,
        expenses,
        netSavings: income - expenses,
      });
    }

    res.status(200).json({
      status: 'success',
      data: { cashFlow },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/net-worth
export const getNetWorthHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const netWorthHistory = [];

    // Calculate historical net worth.
    // To do this dynamically and accurately, we start from current net worth,
    // and subtract net cash flow month-by-month as we go backward.
    const accounts = await prisma.account.findMany({ where: { userId } });
    let currentNetWorth = accounts.reduce((sum, a) => {
      const val = Number(a.balance);
      return a.type === 'CREDIT' ? sum - val : sum + val;
    }, 0);

    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = monthStart.toLocaleString('default', { month: 'short' });

      // Save net worth for this month
      netWorthHistory.unshift({
        month: monthLabel,
        netWorth: currentNetWorth,
      });

      // Calculate net cash flow during this month, to subtract it for the next iteration (older month)
      const txs = await prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      let netFlow = 0;
      txs.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === TransactionType.INCOME) {
          netFlow += amount;
        } else if (t.type === TransactionType.EXPENSE) {
          netFlow -= amount;
        }
      });

      // Subtract the net cash flow of this month to get starting net worth at the beginning of the month
      currentNetWorth -= netFlow;
    }

    res.status(200).json({
      status: 'success',
      data: { netWorthHistory },
    });
  } catch (err) {
    next(err);
  }
};
export const getProjections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Fetch accounts and current savings rate
    const accounts = await prisma.account.findMany({ where: { userId } });
    const totalAssets = accounts.filter(a => a.type !== 'CREDIT').reduce((sum, a) => sum + Number(a.balance), 0);
    const totalDebt = accounts.filter(a => a.type === 'CREDIT').reduce((sum, a) => sum + Number(a.balance), 0);
    let netWorth = totalAssets - totalDebt;

    // Average savings over last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentTxs = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: threeMonthsAgo }
      }
    });

    let totalIncome = 0;
    let totalExpense = 0;
    recentTxs.forEach(t => {
      if (t.type === TransactionType.INCOME) totalIncome += Number(t.amount);
      if (t.type === TransactionType.EXPENSE) totalExpense += Number(t.amount);
    });

    const averageMonthlySavings = Math.max(0, (totalIncome - totalExpense) / 3);

    // Calculate projection for next 12 months
    const projections = [];
    for (let i = 1; i <= 12; i++) {
      netWorth += averageMonthlySavings;
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() + i);
      projections.push({
        month: monthDate.toLocaleString('default', { month: 'short', year: '2-digit' }),
        projectedNetWorth: netWorth,
      });
    }

    res.status(200).json({
      status: 'success',
      data: { projections },
    });
  } catch (err) {
    next(err);
  }
};
