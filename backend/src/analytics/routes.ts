import { Router } from 'express';
import {
  getOverviewStats,
  getSpendBreakdown,
  getCashFlow,
  getNetWorthHistory,
  getProjections,
} from './controllers';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/overview', getOverviewStats);
router.get('/breakdown', getSpendBreakdown);
router.get('/cash-flow', getCashFlow);
router.get('/net-worth', getNetWorthHistory);
router.get('/projections', getProjections);

export default router;
