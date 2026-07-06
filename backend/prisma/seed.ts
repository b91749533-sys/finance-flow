import { PrismaClient, Role, AccountType, TransactionType, GoalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.device.deleteMany();
  await prisma.user.deleteMany();

  // Create hashed passwords
  const demoPasswordHash = await bcrypt.hash('Password123', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123', 10);

  // 1. Create Users
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo User',
      passwordHash: demoPasswordHash,
      role: Role.USER,
      isVerified: true,
      settings: {
        create: {
          theme: 'light',
          currency: 'USD',
          notificationsEnabled: true,
          emailAlerts: true,
        },
      },
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'System Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isVerified: true,
      settings: {
        create: {
          theme: 'dark',
          currency: 'USD',
          notificationsEnabled: true,
          emailAlerts: true,
        },
      },
    },
  });

  console.log('Users created: demo@example.com and admin@example.com');

  // 2. Create Categories (System categories + Custom categories)
  const categoriesData = [
    { name: 'Salary', icon: 'Briefcase', color: '#10B981', type: TransactionType.INCOME },
    { name: 'Freelance', icon: 'Laptop', color: '#34D399', type: TransactionType.INCOME },
    { name: 'Investments', icon: 'TrendingUp', color: '#059669', type: TransactionType.INCOME },
    { name: 'Food & Dining', icon: 'Utensils', color: '#F59E0B', type: TransactionType.EXPENSE },
    { name: 'Housing & Rent', icon: 'Home', color: '#3B82F6', type: TransactionType.EXPENSE },
    { name: 'Utilities', icon: 'Zap', color: '#6366F1', type: TransactionType.EXPENSE },
    { name: 'Transportation', icon: 'Car', color: '#06B6D4', type: TransactionType.EXPENSE },
    { name: 'Entertainment', icon: 'Film', color: '#8B5CF6', type: TransactionType.EXPENSE },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', type: TransactionType.EXPENSE },
    { name: 'Health & Fitness', icon: 'Activity', color: '#EF4444', type: TransactionType.EXPENSE },
    { name: 'Travel', icon: 'Globe', color: '#14B8A6', type: TransactionType.EXPENSE },
  ];

  const categoriesMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const createdCat = await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        userId: demoUser.id, // Assign to demo user
      },
    });
    categoriesMap[cat.name] = createdCat.id;
  }

  console.log('Categories created.');

  // 3. Create Accounts
  const checking = await prisma.account.create({
    data: {
      userId: demoUser.id,
      name: 'Chase College Checking',
      type: AccountType.CHECKING,
      balance: 4520.50,
      currency: 'USD',
    },
  });

  const savings = await prisma.account.create({
    data: {
      userId: demoUser.id,
      name: 'Ally High Yield Savings',
      type: AccountType.SAVINGS,
      balance: 18200.00,
      currency: 'USD',
    },
  });

  const creditCard = await prisma.account.create({
    data: {
      userId: demoUser.id,
      name: 'Chase Freedom Unlimited',
      type: AccountType.CREDIT,
      balance: 320.15, // Positive in db, UI will display as credit card balance
      currency: 'USD',
    },
  });

  console.log('Accounts created.');

  // 4. Create Budgets
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  await prisma.budget.create({
    data: {
      userId: demoUser.id,
      categoryId: categoriesMap['Food & Dining'],
      amountLimit: 500.00,
      period: 'monthly',
      startDate: new Date(currentYear, currentMonth, 1),
      endDate: new Date(currentYear, currentMonth + 1, 0),
    },
  });

  await prisma.budget.create({
    data: {
      userId: demoUser.id,
      categoryId: categoriesMap['Entertainment'],
      amountLimit: 150.00,
      period: 'monthly',
      startDate: new Date(currentYear, currentMonth, 1),
      endDate: new Date(currentYear, currentMonth + 1, 0),
    },
  });

  await prisma.budget.create({
    data: {
      userId: demoUser.id,
      categoryId: categoriesMap['Shopping'],
      amountLimit: 200.00,
      period: 'monthly',
      startDate: new Date(currentYear, currentMonth, 1),
      endDate: new Date(currentYear, currentMonth + 1, 0),
    },
  });

  console.log('Budgets created.');

  // 5. Create Savings Goals
  await prisma.savingsGoal.create({
    data: {
      userId: demoUser.id,
      name: 'New MacBook Pro',
      targetAmount: 2500.00,
      currentAmount: 1200.00,
      deadline: new Date(currentYear, currentMonth + 6, 1),
      status: GoalStatus.ACTIVE,
    },
  });

  await prisma.savingsGoal.create({
    data: {
      userId: demoUser.id,
      name: 'Emergency Fund',
      targetAmount: 10000.00,
      currentAmount: 8000.00,
      deadline: new Date(currentYear, currentMonth + 12, 1),
      status: GoalStatus.ACTIVE,
    },
  });

  console.log('Savings Goals created.');

  // 6. Create Subscriptions
  await prisma.subscription.create({
    data: {
      userId: demoUser.id,
      name: 'Netflix',
      amount: 15.49,
      billingCycle: 'monthly',
      nextBillingDate: new Date(currentYear, currentMonth, 15),
      category: 'Entertainment',
      isActive: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: demoUser.id,
      name: 'Spotify Premium',
      amount: 10.99,
      billingCycle: 'monthly',
      nextBillingDate: new Date(currentYear, currentMonth, 22),
      category: 'Entertainment',
      isActive: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: demoUser.id,
      name: 'Adobe Creative Cloud',
      amount: 54.99,
      billingCycle: 'monthly',
      nextBillingDate: new Date(currentYear, currentMonth, 10),
      category: 'Shopping',
      isActive: true,
    },
  });

  console.log('Subscriptions created.');

  // 7. Create Transactions (over last 40 days)
  const now = new Date();
  
  const transactions = [
    // Income
    { accountId: checking.id, type: TransactionType.INCOME, category: 'Salary', amount: 2200.00, description: 'Paycheck Corp Inc.', daysAgo: 1, tags: ['salary', 'main'] },
    { accountId: checking.id, type: TransactionType.INCOME, category: 'Salary', amount: 2200.00, description: 'Paycheck Corp Inc.', daysAgo: 15, tags: ['salary', 'main'] },
    { accountId: checking.id, type: TransactionType.INCOME, category: 'Salary', amount: 2200.00, description: 'Paycheck Corp Inc.', daysAgo: 30, tags: ['salary', 'main'] },
    { accountId: checking.id, type: TransactionType.INCOME, category: 'Freelance', amount: 450.00, description: 'Website Redesign Project', daysAgo: 5, tags: ['freelance', 'web'] },
    { accountId: checking.id, type: TransactionType.INCOME, category: 'Freelance', amount: 300.00, description: 'Consulting Session', daysAgo: 18, tags: ['freelance', 'consulting'] },
    { accountId: savings.id, type: TransactionType.INCOME, category: 'Investments', amount: 35.20, description: 'Stock Dividend', daysAgo: 10, tags: ['dividend'] },
    
    // Expenses
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Food & Dining', amount: 18.50, description: 'Starbucks Coffee', daysAgo: 2, tags: ['coffee'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Food & Dining', amount: 42.10, description: 'Whole Foods Market', daysAgo: 3, tags: ['groceries'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Food & Dining', amount: 88.00, description: 'The Sushi Place Diner', daysAgo: 4, tags: ['dining-out'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Food & Dining', amount: 12.50, description: 'McDonalds Drive-Thru', daysAgo: 12, tags: ['fast-food'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Food & Dining', amount: 38.40, description: 'Trader Joes Groceries', daysAgo: 16, tags: ['groceries'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Food & Dining', amount: 95.00, description: 'Italian Steakhouse Dinner', daysAgo: 20, tags: ['dining-out'] },

    { accountId: checking.id, type: TransactionType.EXPENSE, category: 'Housing & Rent', amount: 1200.00, description: 'Rent Payment - Appt 4B', daysAgo: 6, tags: ['rent', 'fixed'] },
    { accountId: checking.id, type: TransactionType.EXPENSE, category: 'Utilities', amount: 84.50, description: 'Electric Bill - ConEd', daysAgo: 7, tags: ['utility', 'fixed'] },
    { accountId: checking.id, type: TransactionType.EXPENSE, category: 'Utilities', amount: 65.00, description: 'Internet - Verizon FIOS', daysAgo: 8, tags: ['utility', 'internet'] },
    
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Transportation', amount: 24.50, description: 'Uber Ride', daysAgo: 4, tags: ['rideshare'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Transportation', amount: 35.00, description: 'Gas Station Fuel', daysAgo: 14, tags: ['fuel'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Transportation', amount: 22.00, description: 'Uber Ride', daysAgo: 22, tags: ['rideshare'] },

    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Entertainment', amount: 15.49, description: 'Netflix Subscription', daysAgo: 15, tags: ['subscription', 'entertainment'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Entertainment', amount: 10.99, description: 'Spotify Premium', daysAgo: 22, tags: ['subscription', 'entertainment'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Entertainment', amount: 45.00, description: 'AMC Movie Theatre Tickets', daysAgo: 25, tags: ['movies'] },

    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Shopping', amount: 120.00, description: 'Amazon.com - Clothes', daysAgo: 9, tags: ['online-shopping'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Shopping', amount: 54.99, description: 'Adobe Creative Cloud', daysAgo: 10, tags: ['subscription', 'software'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Shopping', amount: 85.00, description: 'Nike Store - Running Shoes', daysAgo: 28, tags: ['shoes'] },

    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Health & Fitness', amount: 59.99, description: 'Planet Fitness Monthly', daysAgo: 13, tags: ['gym', 'subscription'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Health & Fitness', amount: 24.50, description: 'CVS Pharmacy Medicine', daysAgo: 24, tags: ['pharmacy'] },

    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Travel', amount: 340.00, description: 'Delta Air Lines Flight Ticket', daysAgo: 32, tags: ['flight', 'vacation'] },
    { accountId: creditCard.id, type: TransactionType.EXPENSE, category: 'Travel', amount: 150.00, description: 'Hilton Hotels Deposit', daysAgo: 33, tags: ['hotel', 'vacation'] },
  ];

  for (const t of transactions) {
    const txDate = new Date();
    txDate.setDate(now.getDate() - t.daysAgo);
    
    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        accountId: t.accountId,
        categoryId: categoriesMap[t.category],
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: txDate,
        tags: t.tags,
      },
    });
  }

  // Create some audit logs
  await prisma.auditLog.create({
    data: {
      userId: demoUser.id,
      action: 'USER_REGISTER',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: { message: 'Demo account registered' },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: demoUser.id,
      action: 'USER_LOGIN',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: { message: 'Demo account logged in' },
    },
  });

  console.log('Transactions & Audit Logs created.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
