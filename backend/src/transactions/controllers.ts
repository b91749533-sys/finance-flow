import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';
import { logAuditAction } from '../middlewares/audit';
import { TransactionType } from '@prisma/client';
import { parse } from 'csv-parse/sync';
// Custom CSV Stringifier helper
import { predictCategory } from '../services/ai';
import { emitToUser } from '../services/socket';
import { sendEmail } from '../services/email';

// Helper to check budget threshold and alert if exceeded
export const checkAndAlertBudget = async (userId: string, categoryId: string, amountToAdd: number) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    // Find active budget
    const budget = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: { category: true },
    });

    if (!budget) return;

    // Calculate current spending in category
    const aggregate = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: TransactionType.EXPENSE,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const currentSpent = Number(aggregate._sum.amount || 0);
    const newSpent = currentSpent + amountToAdd;
    const limit = Number(budget.amountLimit);

    if (newSpent > limit) {
      const overAmount = (newSpent - limit).toFixed(2);
      const title = 'Budget Limit Exceeded!';
      const message = `Alert: Your spending in category "${budget.category.name}" has reached $${newSpent.toFixed(2)}, exceeding your monthly budget limit of $${limit.toFixed(2)} by $${overAmount}.`;

      // 1. Save Notification to Database
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'budget_alert',
          title,
          message,
        },
      });

      // 2. Emit WebSocket notification
      emitToUser(userId, 'notification', notification);

      // 3. Send Email Alert (mocked)
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { settings: true } });
      if (user && user.settings?.emailAlerts) {
        await sendEmail(
          user.email,
          'Budget Alert - Finance Platform',
          message,
          `<div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
            <h2 style="color: #EF4444;">${title}</h2>
            <p>${message}</p>
            <p style="font-size: 12px; color: #64748B;">You can adjust your budget limits anytime in the Budgets tab.</p>
          </div>`
        );
      }
    }
  } catch (error) {
    console.error('Error checking budget alerts:', error);
  }
};

// GET /api/v1/transactions
export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      accountId,
      type,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      tag,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = { userId };

    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId as string;
    if (accountId) where.accountId = accountId as string;
    if (type) where.type = type as TransactionType;
    if (tag) where.tags = { has: tag as string };

    // Date range
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Amount range
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount as string);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount as string);
    }

    // Query DB
    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, icon: true, color: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/transactions/categories
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    // Fetch user-defined and system global categories
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId },
          { userId: null },
        ],
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/transactions
export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    let {
      accountId,
      categoryId,
      amount,
      type,
      date,
      description,
      notes,
      tags = [],
      isRecurring = false,
      recurringId,
    } = req.body;

    if (!accountId || !amount || !type || !description) {
      return next(new AppError('Account, amount, type, and description are required', 400));
    }

    // Auto-predict category using Gemini if categoryId is omitted
    if (!categoryId) {
      const userCategories = await prisma.category.findMany({
        where: { OR: [{ userId }, { userId: null }] },
      });
      const predictedId = await predictCategory(description, userCategories);
      
      if (predictedId) {
        categoryId = predictedId;
        console.log(`Gemini predicted category for "${description}": ${categoryId}`);
      } else {
        // Fallback to a default expense/income category or first match
        if (userCategories.length === 0) {
          const defaultCat = await prisma.category.create({
            data: {
              name: 'General',
              type,
              icon: 'ShoppingBag',
              color: '#64748B',
            },
          });
          categoryId = defaultCat.id;
        } else {
          const fallbackCat = userCategories.find((c) => c.type === type) || userCategories[0];
          categoryId = fallbackCat.id;
        }
      }
    }

    const txAmount = parseFloat(amount);
    const parsedDate = date ? new Date(date) : new Date();

    // Verify account ownership
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== userId) {
      return next(new AppError('Account not found or access denied', 404));
    }

    // Start transaction in database
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create the transaction
      const newTx = await tx.transaction.create({
        data: {
          userId,
          accountId,
          categoryId,
          amount: txAmount,
          type,
          date: parsedDate,
          description,
          notes,
          tags,
          isRecurring,
          recurringId,
        },
        include: {
          category: true,
        },
      });

      // 2. Adjust account balance
      let balanceChange = txAmount;
      if (type === TransactionType.EXPENSE) {
        balanceChange = -txAmount;
      } else if (type === TransactionType.TRANSFER) {
        // Simple transfers out for now, real transfers can have a destination account
        balanceChange = -txAmount;
      }

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: balanceChange },
        },
      });

      return newTx;
    });

    // Post-create budget check (Async/non-blocking)
    if (type === TransactionType.EXPENSE) {
      checkAndAlertBudget(userId, categoryId, txAmount);
    }

    await logAuditAction(userId, 'TRANSACTION_CREATE', req, { transactionId: transaction.id, amount: txAmount });

    res.status(201).json({
      status: 'success',
      data: { transaction },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/transactions/:id
export const updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      accountId,
      categoryId,
      amount,
      type,
      date,
      description,
      notes,
      tags,
    } = req.body;

    const oldTx = await prisma.transaction.findUnique({ where: { id } });
    if (!oldTx || oldTx.userId !== userId) {
      return next(new AppError('Transaction not found', 404));
    }

    const newAmount = amount !== undefined ? parseFloat(amount) : Number(oldTx.amount);
    const newType = type || oldTx.type;
    const newAccountId = accountId || oldTx.accountId;

    await prisma.$transaction(async (tx) => {
      // 1. Revert old account balance adjustment
      let oldChange = Number(oldTx.amount);
      if (oldTx.type === TransactionType.EXPENSE) oldChange = -oldChange;
      
      await tx.account.update({
        where: { id: oldTx.accountId },
        data: { balance: { decrement: oldChange } },
      });

      // 2. Update transaction
      await tx.transaction.update({
        where: { id },
        data: {
          ...(accountId && { accountId }),
          ...(categoryId && { categoryId }),
          ...(amount !== undefined && { amount: newAmount }),
          ...(type && { type }),
          ...(date && { date: new Date(date) }),
          ...(description && { description }),
          ...(notes !== undefined && { notes }),
          ...(tags && { tags }),
        },
      });

      // 3. Apply new account balance adjustment
      let newChange = newAmount;
      if (newType === TransactionType.EXPENSE) newChange = -newChange;

      await tx.account.update({
        where: { id: newAccountId },
        data: { balance: { increment: newChange } },
      });
    });

    // Check budget alert
    if (newType === TransactionType.EXPENSE) {
      const budgetCatId = categoryId || oldTx.categoryId;
      const budgetDiff = (newType === oldTx.type && budgetCatId === oldTx.categoryId)
        ? (newAmount - Number(oldTx.amount))
        : newAmount;
      
      if (budgetDiff > 0) {
        checkAndAlertBudget(userId, budgetCatId, budgetDiff);
      }
    }

    await logAuditAction(userId, 'TRANSACTION_UPDATE', req, { transactionId: id });

    res.status(200).json({
      status: 'success',
      message: 'Transaction updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/transactions/:id
export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== userId) {
      return next(new AppError('Transaction not found', 404));
    }

    await prisma.$transaction(async (prismaTx) => {
      // Adjust balance back
      let balanceChange = Number(tx.amount);
      if (tx.type === TransactionType.EXPENSE) {
        balanceChange = balanceChange; // Re-increment balance
      } else {
        balanceChange = -balanceChange; // Decrement income balance
      }

      await prismaTx.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: balanceChange } },
      });

      await prismaTx.transaction.delete({ where: { id } });
    });

    await logAuditAction(userId, 'TRANSACTION_DELETE', req, { transactionId: id });

    res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/transactions/bulk-delete
export const bulkDeleteTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { ids } = req.body; // array of ids

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('Provide list of transaction IDs to delete', 400));
    }

    // Verify ownership and get transaction details
    const txs = await prisma.transaction.findMany({
      where: { id: { in: ids }, userId },
    });

    if (txs.length === 0) {
      return next(new AppError('No matching transactions found', 404));
    }

    await prisma.$transaction(async (prismaTx) => {
      // Loop over and revert accounts balance
      for (const tx of txs) {
        let change = Number(tx.amount);
        if (tx.type === TransactionType.EXPENSE) {
          change = change;
        } else {
          change = -change;
        }

        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: change } },
        });
      }

      // Delete transactions
      await prismaTx.transaction.deleteMany({
        where: { id: { in: txs.map(t => t.id) } },
      });
    });

    await logAuditAction(userId, 'TRANSACTION_BULK_DELETE', req, { count: txs.length });

    res.status(200).json({
      status: 'success',
      message: `${txs.length} transactions deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/transactions/bulk-categorize
export const bulkCategorizeTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { ids, categoryId } = req.body;

    if (!ids || !Array.isArray(ids) || !categoryId) {
      return next(new AppError('Provide transaction IDs and target category ID', 400));
    }

    // Verify category exists
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId }, { userId: null }],
      },
    });

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    // Perform bulk update
    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: {
        categoryId,
      },
    });

    await logAuditAction(userId, 'TRANSACTION_BULK_CATEGORIZE', req, { count: result.count, categoryId });

    res.status(200).json({
      status: 'success',
      message: `${result.count} transactions updated to category "${category.name}".`,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/transactions/export
export const exportCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Format for CSV
    const csvData = transactions.map((t) => ({
      Date: t.date.toISOString().split('T')[0],
      Description: t.description,
      Amount: t.amount,
      Type: t.type,
      Category: t.category.name,
      Account: t.account.name,
      Notes: t.notes || '',
      Tags: t.tags.join(';'),
    }));

    const customStringify = (data: any[]): string => {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const headerLine = headers.join(',');
      const rows = data.map((row) =>
        headers
          .map((header) => {
            const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            const escaped = val.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      );
      return [headerLine, ...rows].join('\n');
    };
    const csvString = customStringify(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.csv"');
    res.status(200).send(csvString);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/transactions/import
export const importCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    if (!req.file) {
      return next(new AppError('Please upload a CSV file', 400));
    }

    const csvContent = req.file.buffer.toString();
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Fetch user profiles, categories and accounts to match names
    const existingAccounts = await prisma.account.findMany({ where: { userId } });
    const existingCategories = await prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
    });

    const accountsMap = new Map(existingAccounts.map((a) => [a.name.toLowerCase(), a.id]));
    const categoriesMap = new Map(existingCategories.map((c) => [`${c.name.toLowerCase()}_${c.type.toLowerCase()}`, c.id]));

    let importedCount = 0;
    const errors: string[] = [];

    // Loop through CSV records and create transactions
    await prisma.$transaction(async (tx) => {
      for (const [index, record] of records.entries()) {
        const rowNum = index + 2;
        const dateStr = record.Date || record.date;
        const desc = record.Description || record.description;
        const amountStr = record.Amount || record.amount;
        const typeStr = (record.Type || record.type || 'EXPENSE').toUpperCase();
        const catName = record.Category || record.category;
        const accName = record.Account || record.account;
        const notes = record.Notes || record.notes || '';
        const tagsStr = record.Tags || record.tags || '';

        if (!dateStr || !desc || !amountStr || !accName || !catName) {
          errors.push(`Row ${rowNum}: Missing mandatory columns.`);
          continue;
        }

        const type = typeStr === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          errors.push(`Row ${rowNum}: Invalid amount "${amountStr}".`);
          continue;
        }

        // Get or Create Account
        let accountId = accountsMap.get(accName.toLowerCase());
        if (!accountId) {
          const newAcc = await tx.account.create({
            data: {
              userId,
              name: accName,
              type: 'CHECKING',
              balance: 0,
            },
          });
          accountsMap.set(accName.toLowerCase(), newAcc.id);
          accountId = newAcc.id;
        }

        // Get or Create Category
        const catKey = `${catName.toLowerCase()}_${type.toLowerCase()}`;
        let categoryId = categoriesMap.get(catKey);
        if (!categoryId) {
          const newCat = await tx.category.create({
            data: {
              userId,
              name: catName,
              icon: 'Tag',
              color: '#3B82F6',
              type,
            },
          });
          categoriesMap.set(catKey, newCat.id);
          categoryId = newCat.id;
        }

        const parsedDate = new Date(dateStr);
        const tags = tagsStr ? tagsStr.split(';').map((t: string) => t.trim()) : [];

        // Save transaction
        await tx.transaction.create({
          data: {
            userId,
            accountId,
            categoryId,
            amount,
            type,
            date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
            description: desc,
            notes,
            tags,
          },
        });

        // Update account balance
        let balDiff = amount;
        if (type === TransactionType.EXPENSE) balDiff = -amount;

        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: balDiff } },
        });

        importedCount++;
      }
    });

    await logAuditAction(userId, 'TRANSACTION_IMPORT_CSV', req, { count: importedCount });

    res.status(200).json({
      status: 'success',
      message: `Successfully imported ${importedCount} transactions.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/transactions/receipt
export const uploadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new AppError('No receipt file uploaded', 400));
    }

    // Mock file upload by saving locally. For production, save to AWS S3/GCS.
    // The router uses multer to store files in backend/uploads/receipts.
    const fileUrl = `/uploads/receipts/${req.file.filename}`;

    res.status(200).json({
      status: 'success',
      data: {
        receiptUrl: fileUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};
