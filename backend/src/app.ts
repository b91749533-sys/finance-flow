import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as path from 'path';

// Import error handler
import { errorHandler } from './middlewares/error';

// Import routers
import authRouter from './auth/routes';
import usersRouter from './users/routes';
import transactionsRouter from './transactions/routes';
import budgetsRouter from './budgets/routes';
import goalsRouter from './goals/routes';
import analyticsRouter from './analytics/routes';
import notificationsRouter from './notifications/routes';
import adminRouter from './admin/routes';
import aiRouter from './ai/routes';

const app = express();

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow serving local receipts to frontend
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads serving (for receipt previews)
const uploadDir = path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Routes configuration
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/budgets', budgetsRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/ai', aiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
